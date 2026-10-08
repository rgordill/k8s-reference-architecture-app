import { useState } from 'react';
import {
  ExpandableSection,
  Flex,
  FlexItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import {
  buildSizingTable,
  collectSizingComponents,
  normalizeSizing,
  type SizingTableModel,
} from '../data/sizing';
import type { Architecture } from '../data/types';

export function SizingSection({ architecture }: { architecture: Architecture }) {
  const profiles = normalizeSizing(architecture.sizing);
  const [isExpanded, setIsExpanded] = useState(false);
  if (profiles.length === 0) {
    return null;
  }

  const components = collectSizingComponents(profiles);
  const tables = profiles.map((profile) =>
    buildSizingTable(profile, components),
  );

  return (
    <section data-testid="architecture-sizing">
      <ExpandableSection
        toggleText="Sizing"
        isExpanded={isExpanded}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
      >
        {isExpanded ? (
          <Flex
            className="app-sizing-tables"
            spaceItems={{ default: 'spaceItemsLg' }}
            flexWrap={{ default: 'wrap' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem>
              <ComponentHeadersTable components={components} />
            </FlexItem>
            {tables.map((model) => (
              <FlexItem key={model.name}>
                <SizingValuesTable model={model} />
              </FlexItem>
            ))}
          </Flex>
        ) : null}
      </ExpandableSection>
    </section>
  );
}

function ComponentHeadersTable({ components }: { components: string[] }) {
  return (
    <div className="app-sizing-table" data-testid="sizing-table-components">
      <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">
        Component
      </Title>
      <table className="pf-v6-c-table pf-m-compact app-sizing-aligned-table" role="grid">
        <thead className="pf-v6-c-table__thead">
          <tr className="pf-v6-c-table__tr" role="row">
            <th className="pf-v6-c-table__th" role="columnheader" scope="col">
              Name
            </th>
          </tr>
        </thead>
        <tbody className="pf-v6-c-table__tbody">
          {components.map((name) => (
            <tr key={name} className="pf-v6-c-table__tr" role="row">
              <th className="pf-v6-c-table__th" scope="row">
                {name}
              </th>
            </tr>
          ))}
        </tbody>
        <tfoot className="pf-v6-c-table__tfoot">
          <tr className="pf-v6-c-table__tr" role="row">
            <th className="pf-v6-c-table__th" scope="row">
              Total
            </th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SizingValuesTable({ model }: { model: SizingTableModel }) {
  const description = model.description?.trim();
  const title = (
    <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">
      {model.name}
    </Title>
  );

  return (
    <div className="app-sizing-table" data-testid={`sizing-table-${model.name}`}>
      {description ? (
        <Tooltip content={description} position="top">
          <span className="app-sizing-table-title">{title}</span>
        </Tooltip>
      ) : (
        title
      )}
      <table className="pf-v6-c-table pf-m-compact app-sizing-aligned-table" role="grid">
        <thead className="pf-v6-c-table__thead">
          <tr className="pf-v6-c-table__tr" role="row">
            {model.showReplicas ? (
              <th className="pf-v6-c-table__th" role="columnheader" scope="col">
                Replicas
              </th>
            ) : null}
            <th className="pf-v6-c-table__th" role="columnheader" scope="col">
              CPU
            </th>
            <th className="pf-v6-c-table__th" role="columnheader" scope="col">
              Memory
            </th>
          </tr>
        </thead>
        <tbody className="pf-v6-c-table__tbody">
          {model.rows.map((row) => (
            <tr key={row.name} className="pf-v6-c-table__tr" role="row">
              {model.showReplicas ? (
                <td className="pf-v6-c-table__td" role="cell" data-label="Replicas">
                  {row.replicas > 0 ? row.replicas : '—'}
                </td>
              ) : null}
              <td className="pf-v6-c-table__td" role="cell" data-label="CPU">
                {row.cpu || '—'}
              </td>
              <td className="pf-v6-c-table__td" role="cell" data-label="Memory">
                {row.memory || '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="pf-v6-c-table__tfoot">
          <tr className="pf-v6-c-table__tr" role="row">
            {model.showReplicas ? (
              <td className="pf-v6-c-table__td" role="cell" />
            ) : null}
            <td className="pf-v6-c-table__td" role="cell" data-label="CPU">
              <strong>{model.totalCpu}</strong>
            </td>
            <td className="pf-v6-c-table__td" role="cell" data-label="Memory">
              <strong>{model.totalMemory}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
