"use client";

import { useRef, type ChangeEvent } from "react";
import { fillPlaceholders, getContent } from "../../lib/content";
import { ACCEPT_ATTRIBUTE, fileSizeLabel, uploadHelperText } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

export type CvUploadBoxProps = {
  /** The file input's id; the helper and problem lines take it as their prefix. */
  idBase: string;
  file: File | undefined;
  /** The file problem under the box, already worded. */
  problem: string | undefined;
  /** A file is being dragged over the drop area. */
  dragging: boolean;
  disabled: boolean;
  /** Every file chosen or dropped, checked by the caller with checkFiles. */
  onFiles: (files: File[]) => void;
  onRemove: () => void;
};

/**
 * The A1 upload box, shared by A1 and the B6 Re-score popup so both have the same states, file
 * rules and errors (B6 dev notes). The caller checks the files and owns the drop area.
 */
export function CvUploadBox({
  idBase,
  file,
  problem,
  dragging,
  disabled,
  onFiles,
  onRemove,
}: CvUploadBoxProps) {
  const text = getContent("app/upload").uploadBox;
  const fileInput = useRef<HTMLInputElement>(null);

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    onFiles(Array.from(event.target.files ?? []));
    // Cleared so choosing the same file again still counts as a change.
    event.target.value = "";
  }

  const boxClass = [
    styles.box,
    dragging ? styles.boxDragging : "",
    !dragging && problem !== undefined ? styles.boxError : "",
    !dragging && problem === undefined && file !== undefined ? styles.boxChosen : "",
    !dragging && problem === undefined && file === undefined ? styles.boxEmpty : "",
  ].join(" ");
  const showFile = file !== undefined && !dragging;

  return (
    <>
      <section className={boxClass} aria-label={text.label}>
        <input
          ref={fileInput}
          id={idBase}
          className={styles.fileInput}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={onInputChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className={styles.boxIcon}>
          <FieldIcon name={showFile ? "file" : "upload"} />
        </span>
        {showFile ? (
          <>
            <p className={styles.fileName}>
              {fillPlaceholders(text.fileSummary, {
                name: file.name,
                size: fileSizeLabel(file.size),
              })}
            </p>
            <div className={styles.fileActions}>
              <button
                type="button"
                className={styles.textButton}
                onClick={onRemove}
                disabled={disabled}
              >
                {text.remove}
              </button>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => fileInput.current?.click()}
                disabled={disabled}
              >
                {text.chooseDifferent}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.boxTitle}>{dragging ? text.draggingTitle : text.title}</p>
            <p className={styles.boxOr}>{text.or}</p>
            <button
              type="button"
              className={styles.chooseButton}
              onClick={() => fileInput.current?.click()}
              disabled={disabled}
              aria-describedby={`${idBase}-helper ${idBase}-problem`}
            >
              {text.choose}
            </button>
            <p id={`${idBase}-helper`} className={styles.boxHelper}>
              {uploadHelperText()}
            </p>
          </>
        )}
      </section>
      <p
        id={`${idBase}-problem`}
        className={styles.boxProblem}
        aria-live="polite"
        hidden={problem === undefined}
      >
        <FieldIcon name="alert" />
        {problem ?? ""}
      </p>
    </>
  );
}
