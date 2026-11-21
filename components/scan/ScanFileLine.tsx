import { fillPlaceholders, getContent } from "../../lib/content";
import type { ScanFileInfo } from "../../lib/scan/scan-file-info";
import { fileSizeLabel } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./scan.module.css";

/** "my-cv.pdf, 412 KB" with the file icon, in muted text (B1 and B2 frames). */
export function ScanFileLine({ file }: { file: ScanFileInfo | undefined }) {
  if (file === undefined) return null;
  const fileSummary = getContent("app/upload").uploadBox.fileSummary;
  return (
    <p className={styles.file}>
      <FieldIcon name="file" />
      {fillPlaceholders(fileSummary, { name: file.name, size: fileSizeLabel(file.size) })}
    </p>
  );
}
