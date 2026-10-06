import {
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  Page,
  PageSection,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Link, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function AppLayout() {
  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Title headingLevel="h1" size="lg">
              Kubernetes Reference Architectures
            </Title>
          </Link>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar id="app-toolbar" isFullHeight>
          <ToolbarContent>
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>
                <ThemeToggle />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

  return (
    <Page masthead={header}>
      <PageSection isFilled>
        <Outlet />
      </PageSection>
    </Page>
  );
}
