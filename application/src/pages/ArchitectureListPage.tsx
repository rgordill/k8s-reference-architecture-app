import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  FormSelect,
  FormSelectOption,
  Gallery,
  GalleryItem,
  Label,
  LabelGroup,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  architectureRepository,
  collectFilterOptions,
  filterArchitectures,
  type ArchitectureSummary,
} from '../data';

export function ArchitectureListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ArchitectureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nameFilter = searchParams.get('name') ?? '';
  const usageFilter = searchParams.get('usage') ?? '';
  const tagFilter = searchParams.get('tag') ?? '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    architectureRepository
      .list()
      .then((list) => {
        if (!cancelled) {
          setItems(list);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load architectures');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => collectFilterOptions(items), [items]);
  const filtered = useMemo(
    () =>
      filterArchitectures(items, {
        name: nameFilter,
        usage: usageFilter,
        tag: tagFilter,
      }),
    [items, nameFilter, usageFilter, tagFilter],
  );

  const updateParam = (key: 'name' | 'usage' | 'tag', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasFilters = Boolean(nameFilter || usageFilter || tagFilter);

  if (loading) {
    return <Spinner aria-label="Loading architectures" />;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <>
      <Title headingLevel="h2" size="2xl" className="pf-v6-u-mb-md">
        Reference architectures
      </Title>

      <Toolbar
        id="architecture-filters"
        clearAllFilters={clearFilters}
        className="pf-v6-u-mb-lg"
      >
        <ToolbarContent>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="md">
            <ToolbarGroup variant="filter-group">
              <ToolbarFilter
                labels={nameFilter ? [nameFilter] : []}
                deleteLabel={() => updateParam('name', '')}
                deleteLabelGroup={() => updateParam('name', '')}
                categoryName="Name"
              >
                <ToolbarItem>
                  <SearchInput
                    aria-label="Filter by name"
                    placeholder="Filter by name (e.g. cert-manager:*)"
                    value={nameFilter}
                    onChange={(_event, value) => updateParam('name', value)}
                    onClear={() => updateParam('name', '')}
                  />
                </ToolbarItem>
              </ToolbarFilter>

              <ToolbarFilter
                labels={usageFilter ? [usageFilter] : []}
                deleteLabel={() => updateParam('usage', '')}
                deleteLabelGroup={() => updateParam('usage', '')}
                categoryName="Usage"
              >
                <ToolbarItem>
                  <FormSelect
                    aria-label="Filter by usage"
                    value={usageFilter}
                    onChange={(_event, value) => updateParam('usage', value)}
                  >
                    <FormSelectOption value="" label="All usages" />
                    {options.usages.map((usage) => (
                      <FormSelectOption key={usage} value={usage} label={usage} />
                    ))}
                  </FormSelect>
                </ToolbarItem>
              </ToolbarFilter>

              <ToolbarFilter
                labels={tagFilter ? [tagFilter] : []}
                deleteLabel={() => updateParam('tag', '')}
                deleteLabelGroup={() => updateParam('tag', '')}
                categoryName="Tag"
              >
                <ToolbarItem>
                  <FormSelect
                    aria-label="Filter by tag"
                    value={tagFilter}
                    onChange={(_event, value) => updateParam('tag', value)}
                  >
                    <FormSelectOption value="" label="All tags" />
                    {options.tags.map((tag) => (
                      <FormSelectOption key={tag} value={tag} label={tag} />
                    ))}
                  </FormSelect>
                </ToolbarItem>
              </ToolbarFilter>
            </ToolbarGroup>
          </ToolbarToggleGroup>

          {hasFilters ? (
            <ToolbarItem>
              <Button variant="link" onClick={clearFilters}>
                Clear filters
              </Button>
            </ToolbarItem>
          ) : null}
        </ToolbarContent>
      </Toolbar>

      <p className="pf-v6-u-mb-md" aria-live="polite">
        Showing {filtered.length} of {items.length} architectures
      </p>

      {filtered.length === 0 ? (
        <p>No architectures match the current filters.</p>
      ) : (
        <Gallery hasGutter minWidths={{ default: '280px' }}>
          {filtered.map((item) => (
            <GalleryItem key={item.name}>
              <Card className="app-architecture-card" isClickable>
                <CardTitle>
                  <Link to={`/architectures/${encodeURIComponent(item.name)}`}>
                    {item.name}
                  </Link>
                  {item.version ? (
                    <Label className="pf-v6-u-ml-sm" color="blue">
                      {item.version}
                    </Label>
                  ) : null}
                </CardTitle>
                <CardBody>
                  <p>{item.description}</p>
                  {item.tags.length > 0 ? (
                    <LabelGroup className="pf-v6-u-mt-sm" numLabels={4}>
                      {item.tags.map((tag) => (
                        <Label
                          key={tag}
                          color="purple"
                          onClick={(event) => {
                            event.preventDefault();
                            updateParam('tag', tag);
                          }}
                        >
                          {tag}
                        </Label>
                      ))}
                    </LabelGroup>
                  ) : null}
                </CardBody>
                <CardFooter>
                  <Link to={`/architectures/${encodeURIComponent(item.name)}`}>
                    View diagram
                  </Link>
                </CardFooter>
              </Card>
            </GalleryItem>
          ))}
        </Gallery>
      )}
    </>
  );
}
