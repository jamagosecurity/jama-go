/**
 * Builds a WhatsApp deep link prefilled with a message.
 *
 * wa.me needs a phone number to target one chat; without one, only
 * api.whatsapp.com/send opens WhatsApp with the text ready and lets the
 * sender pick who gets it. Neither can attach a file from a web page, so the
 * message is the only payload this can ever carry.
 */
export function whatsAppShareUrl(contactNumber: string | null, message: string): string {
  const digits = (contactNumber ?? '').replace(/[^0-9]/g, '');
  const text = encodeURIComponent(message);
  return digits
    ? `https://wa.me/${digits}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

/** A mailto: link prefilled with a subject and body — no "to" address, since
 *  no client email is stored anywhere in this app. */
export function mailtoShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * The message body for sharing a quotation, used from both the editor and
 * the list — wa.me/mailto can only carry text, so this always says the file
 * has just been downloaded and needs attaching, never that it already is.
 */
export function boqShareMessage(boq: {
  boqNumber: string;
  projectName: string;
  clientName: string | null;
}): string {
  return [
    `Hello${boq.clientName ? ' ' + boq.clientName : ''},`,
    '',
    `Please find attached quotation ${boq.boqNumber}${boq.projectName ? ' for ' + boq.projectName : ''}.`,
    '(The PDF has just been downloaded to your computer — attach it here before sending.)',
    '',
    'Kind regards,',
    'Jama Go Security Equipment',
  ].join('\n');
}

/** Mirrors boqShareMessage for a quotation — see there for why the wording is
 *  what it is. */
export function quotationShareMessage(quotation: {
  quoteNumber: string;
  customerName: string;
}): string {
  return [
    `Hello${quotation.customerName ? ' ' + quotation.customerName : ''},`,
    '',
    `Please find attached quotation ${quotation.quoteNumber}.`,
    '(The PDF has just been downloaded to your computer — attach it here before sending.)',
    '',
    'Kind regards,',
    'Jama Go Security Equipment',
  ].join('\n');
}

/** Mirrors boqShareMessage for a drawing — see there for why the wording is
 *  what it is. */
export function drawingShareMessage(drawing: {
  drawingNumber: string;
  projectName: string;
  clientName: string | null;
}): string {
  return [
    `Hello${drawing.clientName ? ' ' + drawing.clientName : ''},`,
    '',
    `Please find attached drawing ${drawing.drawingNumber}${drawing.projectName ? ' for ' + drawing.projectName : ''}.`,
    '(Attach the approved file(s) from the drawing before sending.)',
    '',
    'Kind regards,',
    'Jama Go Security Equipment',
  ].join('\n');
}
