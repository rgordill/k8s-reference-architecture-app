# Sizing

To estimate the resource requirements of a Kubernetes namespace, we can use PromQL to measure the **observed CPU and memory consumption** of its workloads.

The queries below calculate the **peak resource usage observed during the selected time window**. These values can then be used as a baseline for defining Kubernetes `requests` and `limits`, with an appropriate safety margin.

> **Prerequisites:** These queries require the Kubernetes container metrics exposed through Prometheus, such as `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes` (typically provided by kubelet/cAdvisor metrics).

## CPU

```promql
max_over_time(
  sum by (pod) (
    rate(
      container_cpu_usage_seconds_total{
        namespace="my-namespace",
        container!="",
        container!="POD"
      }[5m]
    )
  )[1h:1m]
)
```

This returns the **maximum CPU usage per pod**, in CPU cores, observed during the last hour.

For example:

* `0.5` = 500 millicores (`500m`)
* `1.0` = 1 CPU core
* `2.0` = 2 CPU cores

### Namespace-wide peak CPU

If the objective is to determine the CPU required by the **namespace as a whole**, aggregate the pods before applying `max_over_time`:

```promql
max_over_time(
  sum(
    rate(
      container_cpu_usage_seconds_total{
        namespace="my-namespace",
        container!="",
        container!="POD"
      }[5m]
    )
  )[1h:1m]
)
```

This is useful when sizing the total CPU capacity required by the namespace.

## Memory

```promql
max_over_time(
  sum by (pod) (
    container_memory_working_set_bytes{
      namespace="my-namespace",
      container!="",
      container!="POD"
    }
  )[1h:1m]
)
```

This returns the **maximum memory working set per pod**, observed during the last hour.

To express the result in GiB:

```promql
max_over_time(
  sum by (pod) (
    container_memory_working_set_bytes{
      namespace="my-namespace",
      container!="",
      container!="POD"
    }
  )[1h:1m]
) / 1024^3
```

### Namespace-wide peak memory

For the peak memory required by the namespace as a whole:

```promql
max_over_time(
  sum(
    container_memory_working_set_bytes{
      namespace="my-namespace",
      container!="",
      container!="POD"
    }
  )[1h:1m]
) / 1024^3
```

## Understanding the queries

### `max_over_time(...[1h:1m])`

`[1h:1m]` is a **subquery**. It evaluates the inner expression every minute over the previous hour. `max_over_time` then returns the highest value observed during that period.

This is useful for sizing because it captures the **peak observed consumption**, rather than only the current value.

The observation window should ideally cover representative workload behavior. For production sizing, consider using a longer period such as **24 hours, 7 days, or several weeks** if the workload has daily, weekly, or periodic peaks.

For example:

```promql
max_over_time(
  <expression>
  [7d:5m]
)
```

The appropriate interval depends on the workload and the Prometheus retention period.

### CPU `rate()` window

The CPU query uses:

```promql
rate(container_cpu_usage_seconds_total[5m])
```

The `5m` window smooths short-term CPU fluctuations.

A shorter window, such as `[1m]`, can be used when short CPU spikes are important:

```promql
rate(container_cpu_usage_seconds_total[1m])
```

As a rule of thumb, the range should be sufficiently larger than the Prometheus scrape interval to provide enough samples for a reliable rate calculation.

### Container filtering

The following filters are intentional:

```promql
container!="",
container!="POD"
```

`container!=""` excludes empty container labels and prevents pod-level aggregate series from being included.

`container!="POD"` excludes the Kubernetes pause/infrastructure container.

This avoids counting the same resources through both container-level and pod-level series.

### Memory metric

`container_memory_working_set_bytes` represents the container's memory working set and is generally the most useful metric for Kubernetes memory sizing.

`container_memory_usage_bytes` can be useful when analyzing total memory consumption, including cached memory, but should not automatically be used as the basis for Kubernetes memory requests.

## From observed usage to Kubernetes sizing

The PromQL queries provide **observed consumption**, not necessarily the final Kubernetes resource configuration.

A typical sizing process is:

```text
Prometheus metrics
       │
       ▼
Observed resource usage
       │
       ▼
Peak / percentile analysis
       │
       ▼
Add safety margin
       │
       ▼
Kubernetes requests / limits
```

For example, if a workload reaches:

```text
Peak CPU:    750m
Peak memory: 1.8 GiB
```

you might choose requests such as:

```yaml
resources:
  requests:
    cpu: "1"
    memory: "2Gi"
```

The exact values should account for workload characteristics and the desired scheduling and availability guarantees.

### Requests

CPU and memory requests determine how much resource Kubernetes reserves for scheduling purposes.

Requests should generally be based on the workload's **sustained/expected consumption**, rather than simply taking the absolute maximum observed value.

### Limits

Limits are a separate decision.

For CPU, a limit can throttle a container when it exceeds the configured value.

For memory, exceeding the limit can result in an **OOM kill**, so memory limits should generally provide sufficient headroom above normal and expected peak usage.

Avoid blindly setting:

```text
request = peak usage
limit = peak usage
```

because this can leave no room for normal workload variability or unexpected spikes.

## Percentiles can be more useful than absolute peaks

Absolute maximum values can be dominated by a single anomalous spike. For capacity planning, it can be useful to compare several percentiles, for example P50, P95, P99, and maximum.

For CPU:

```promql
quantile_over_time(
  0.95,
  sum by (pod) (
    rate(
      container_cpu_usage_seconds_total{
        namespace="my-namespace",
        container!="",
        container!="POD"
      }[5m]
    )
  )[7d:5m]
)
```

A useful sizing approach is to use a percentile such as **P95/P99 for normal capacity** and separately account for the absolute peak when deciding limits or burst capacity.

## Replica-aware sizing

When sizing an application, consider both:

* **Per-pod sizing** — how much CPU/memory an individual replica requires.
* **Total workload sizing** — how much the application requires across all replicas.

For example, if a deployment normally runs 3 replicas and each pod requires approximately:

```text
CPU:    500m
Memory: 1Gi
```

the baseline workload requirement is approximately:

```text
CPU:    1.5 CPU
Memory: 3Gi
```

If the deployment can scale to 10 replicas, capacity planning should consider the maximum expected replica count as well.

## Recommendations

When performing production sizing:

1. **Measure over a representative period.** One hour may be sufficient for a quick estimate, but production sizing should ideally include daily and weekly workload patterns.
2. **Look at both peak and percentiles.** P95/P99 can be more representative than a single absolute maximum.
3. **Size per pod and for the complete workload.**
4. **Include scaling behavior.** Account for HPA/VPA or other mechanisms that can increase the number of replicas.
5. **Include operational headroom.** Leave capacity for workload spikes, Kubernetes/system overhead, rolling deployments, and failover.
6. **Consider node-level capacity.** Namespace requirements must ultimately fit within the available allocatable CPU and memory of the cluster.
7. **Account for non-application workloads.** DaemonSets, system pods, ingress, monitoring, logging, and other platform components also consume node resources.
8. **Treat CPU and memory differently.** CPU can generally tolerate temporary overcommit and throttling; memory exhaustion can result in OOM kills.
9. **Repeat the measurement after changing requests/limits.** Resource configuration can itself affect workload behavior.
10. **Use workload-specific knowledge.** Metrics alone cannot determine the correct safety margin or availability requirements.

## Important distinction

These queries answer:

> **"How much resource did the workload actually consume?"**

They do not directly answer:

> **"How much resource should I reserve for it?"**

The latter should combine observed consumption with workload behavior, scaling requirements, availability objectives, and an appropriate safety margin.
