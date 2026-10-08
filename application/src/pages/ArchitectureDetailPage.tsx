import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArchitectureMeta } from '../components/ArchitectureMeta';
import { SizingSection } from '../components/SizingSection';
import {
  architectureRepository,
  styleRepository,
  type Architecture,
  type StyleDefinition,
} from '../data';
import { ArchitectureDiagram } from '../diagram/ArchitectureDiagram';
import { useTheme } from '../theme/ThemeContext';

export function ArchitectureDetailPage() {
  const { name = '' } = useParams();
  const decodedName = decodeURIComponent(name);
  const { theme } = useTheme();

  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [styles, setStyles] = useState<StyleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([architectureRepository.get(decodedName), styleRepository.list()])
      .then(([arch, styleList]) => {
        if (cancelled) return;
        if (!arch) {
          setError(`Architecture not found: ${decodedName}`);
          setArchitecture(null);
        } else {
          setArchitecture(arch);
          setError(null);
        }
        setStyles(styleList);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load architecture');
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
  }, [decodedName]);

  const relevantStyles = useMemo(() => {
    if (!architecture) {
      return styles;
    }
    const ids = new Set<string>();
    for (const node of architecture.diagram.nodes) {
      ids.add(node.style);
    }
    for (const edge of architecture.diagram.edges) {
      ids.add(edge.style);
    }
    for (const group of architecture.diagram.groups ?? []) {
      if (group.style) {
        ids.add(group.style);
      }
    }
    return styles.filter((s) => ids.has(s.id));
  }, [architecture, styles]);

  if (loading) {
    return <Spinner aria-label="Loading architecture" />;
  }

  if (error || !architecture) {
    return (
      <>
        <Breadcrumb>
          <BreadcrumbItem render={({ className }) => (
            <Link className={className} to="/">
              Architectures
            </Link>
          )}
          />
          <BreadcrumbItem isActive>{decodedName}</BreadcrumbItem>
        </Breadcrumb>
        <p role="alert" className="pf-v6-u-mt-md">
          {error ?? 'Not found'}
        </p>
      </>
    );
  }

  const exportBasename = architecture.name.replace(/[^a-zA-Z0-9._-]+/g, '_');

  return (
    <>
      <Breadcrumb className="pf-v6-u-mb-md">
        <BreadcrumbItem
          render={({ className }) => (
            <Link className={className} to="/">
              Architectures
            </Link>
          )}
        />
        <BreadcrumbItem isActive>{architecture.name}</BreadcrumbItem>
      </Breadcrumb>

      <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
        <FlexItem>
          <Flex direction={{ default: 'column', lg: 'row' }} gap={{ default: 'gapLg' }}>
            <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 280, maxWidth: 480 }}>
              <ArchitectureMeta architecture={architecture} />
            </FlexItem>
            <FlexItem flex={{ default: 'flex_2' }} style={{ minWidth: 0, flexGrow: 1 }}>
              <Card className="app-diagram-card" isFullHeight>
                <CardTitle>
                  <Title headingLevel="h3" size="lg">
                    Diagram
                  </Title>
                </CardTitle>
                <CardBody>
                  <ArchitectureDiagram
                    diagram={architecture.diagram}
                    styles={relevantStyles}
                    theme={theme}
                    exportBasename={exportBasename}
                  />
                </CardBody>
              </Card>
            </FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          <SizingSection architecture={architecture} />
        </FlexItem>
      </Flex>
    </>
  );
}
