import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import {
  DownloadIcon,
  ExpandArrowsAltIcon,
  ImageIcon,
} from '@patternfly/react-icons';

export interface ExportToolbarProps {
  onExportSvg: () => void;
  onExportPng: () => void;
  onFitView: () => void;
  disabled?: boolean;
}

export function ExportToolbar({
  onExportSvg,
  onExportPng,
  onFitView,
  disabled = false,
}: ExportToolbarProps) {
  return (
    <Toolbar id="diagram-export-toolbar">
      <ToolbarContent>
        <ToolbarItem>
          <Button
            variant="secondary"
            icon={<ExpandArrowsAltIcon />}
            onClick={onFitView}
            isDisabled={disabled}
            data-testid="diagram-fit-view"
          >
            Fit view
          </Button>
        </ToolbarItem>
        <ToolbarItem>
          <Button
            variant="secondary"
            icon={<DownloadIcon />}
            onClick={onExportSvg}
            isDisabled={disabled}
          >
            Export SVG
          </Button>
        </ToolbarItem>
        <ToolbarItem>
          <Button
            variant="secondary"
            icon={<ImageIcon />}
            onClick={onExportPng}
            isDisabled={disabled}
          >
            Export PNG
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
}
