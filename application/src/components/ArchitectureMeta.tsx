import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
  List,
  ListItem,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import {
  normalizeAdditionalProperties,
  normalizeDependencies,
  type Architecture,
} from '../data';

function dependencyBrowsePath(pattern: string): string {
  const params = new URLSearchParams();
  params.set('name', pattern);
  return `/?${params.toString()}`;
}

export function ArchitectureMeta({ architecture }: { architecture: Architecture }) {
  const dependencies = normalizeDependencies(architecture.dependencies);
  const additional = normalizeAdditionalProperties(architecture.additionalProperties);
  const tags = architecture.tags ?? [];

  return (
    <>
      <Title headingLevel="h2" size="xl">
        {architecture.name}
        {architecture.version ? (
          <Label className="pf-v6-u-ml-sm" color="blue">
            {architecture.version}
          </Label>
        ) : null}
      </Title>
      <p className="pf-v6-u-mt-md pf-v6-u-mb-lg">{architecture.description}</p>

      <DescriptionList isHorizontal isCompact>
        <DescriptionListGroup>
          <DescriptionListTerm>Characteristics</DescriptionListTerm>
          <DescriptionListDescription>
            <List isPlain>
              {architecture.characteristics.map((item) => (
                <ListItem key={item}>{item}</ListItem>
              ))}
            </List>
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>Usage</DescriptionListTerm>
          <DescriptionListDescription>
            <LabelGroup>
              {architecture.usage.map((item) => (
                <Label
                  key={item}
                  color="green"
                  render={({ className, content }) => (
                    <Link
                      className={className}
                      to={`/?${new URLSearchParams({ usage: item }).toString()}`}
                    >
                      {content}
                    </Link>
                  )}
                >
                  {item}
                </Label>
              ))}
            </LabelGroup>
          </DescriptionListDescription>
        </DescriptionListGroup>

        {tags.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Tags</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {tags.map((item) => (
                  <Label
                    key={item}
                    color="purple"
                    render={({ className, content }) => (
                      <Link
                        className={className}
                        to={`/?${new URLSearchParams({ tag: item }).toString()}`}
                      >
                        {content}
                      </Link>
                    )}
                  >
                    {item}
                  </Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}

        {dependencies.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Dependencies</DescriptionListTerm>
            <DescriptionListDescription>
              <List isPlain>
                {dependencies.map((item) => (
                  <ListItem key={item}>
                    <Link to={dependencyBrowsePath(item)} title={`Browse architectures matching ${item}`}>
                      {item}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}

        {architecture.components && architecture.components.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Components</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {architecture.components.map((item) => (
                  <Label key={item}>{item}</Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}

        {architecture.source && architecture.source.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Source</DescriptionListTerm>
            <DescriptionListDescription>
              <List isPlain>
                {architecture.source.map((item) => (
                  <ListItem key={item}>
                    <a href={item} target="_blank" rel="noreferrer">
                      {item}
                    </a>
                  </ListItem>
                ))}
              </List>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}

        {architecture.documentation && architecture.documentation.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Documentation</DescriptionListTerm>
            <DescriptionListDescription>
              <List isPlain>
                {architecture.documentation.map((item) => (
                  <ListItem key={item}>
                    <a href={item} target="_blank" rel="noreferrer">
                      {item}
                    </a>
                  </ListItem>
                ))}
              </List>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}

        {additional.length > 0 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Additional</DescriptionListTerm>
            <DescriptionListDescription>
              <List isPlain>
                {additional.map(({ key, value }) => (
                  <ListItem key={`${key}-${value}`}>
                    <strong>{key}: </strong>
                    <a href={value} target="_blank" rel="noreferrer">
                      {value}
                    </a>
                  </ListItem>
                ))}
              </List>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
      </DescriptionList>
    </>
  );
}
