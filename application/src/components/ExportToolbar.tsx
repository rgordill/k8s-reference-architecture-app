import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { DownloadIcon, ImageIcon } from '@patternfly/react-icons';

export interface ExportToolbarProps {
  onExportSvg: () => void;
  onExportPng: () => void;
  disabled?: boolean;
}

export function ExportToolbar({
  onExportSvg,
  onExportPng,
  disabled = false,
}: ExportToolbarProps) {
  return (
    <Toolbar id="diagram-export-toolbar">
      <ToolbarContent>
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
