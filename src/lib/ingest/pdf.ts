// PDF text extraction, and — the actual engineering problem here per
// the brief — a check for whether that extraction can be trusted at
// all for Arabic.
//
// Tested this directly against a PDF built the normal way (an HTML
// page with vowelled Arabic, printed to PDF by a real browser, which
// is exactly how a lot of real-world Arabic PDFs get made). The text
// layer came back with Arabic Presentation Forms (shaped, contextual
// glyph variants — U+FB50–FDFF and U+FE70–FEFF) in visual/glyph order,
// diacritics scattered relative to their base letters, no relation to
// logical reading order. That's not a fixable formatting quirk —
// there is no reliable way to reconstruct correct logical-order
// Unicode from that without real layout analysis, and guessing would
// risk silently handing back subtly wrong Arabic to a hafiz-level
// reader, which is worse than refusing.
//
// So: extract, then check. A text layer built from proper logical-
// order Unicode (many Word/LibreOffice exports, and hopefully the
// university's own PDFs) has close to zero Presentation Forms
// characters. One that's mostly shaped glyphs gets flagged as
// unreliable and pointed at the photo-upload path instead, which uses
// Claude's vision reading rather than trusting the PDF's internal
// text layer at all.

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PRESENTATION_FORMS = /[ﭐ-﷿ﹰ-﻿]/g;
const BASIC_ARABIC = /[؀-ۿ]/g;
const UNRELIABLE_RATIO_THRESHOLD = 0.05;

export type PdfExtractResult = {
  text: string;
  pageCount: number;
  reliable: boolean;
  warning?: string;
};

export async function extractPdfText(buffer: Buffer): Promise<PdfExtractResult> {
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(""));
  }
  const text = pages.join("\n\n");

  const presentationForms = (text.match(PRESENTATION_FORMS) || []).length;
  const basicArabic = (text.match(BASIC_ARABIC) || []).length;
  const totalArabicish = presentationForms + basicArabic;
  const ratio = totalArabicish === 0 ? 0 : presentationForms / totalArabicish;
  const reliable = ratio < UNRELIABLE_RATIO_THRESHOLD;

  return {
    text,
    pageCount: doc.numPages,
    reliable,
    warning: reliable
      ? undefined
      : "This PDF's text layer looks shaped/reordered rather than plain Unicode — extraction can't be trusted for Arabic here. Try the page-photo upload instead, which reads the page as an image rather than trusting the PDF's internal text.",
  };
}
