/**
 * Build kitchen item remark from Without / Add fields.
 * Example: "Please prepare the order without onion and add fresh tomato. Thank you!"
 */
export function buildModifiedRequestRemark(
  without?: string | null,
  add?: string | null,
): string {
  const withoutText = String(without || '').trim();
  const addText = String(add || '').trim();
  if (!withoutText && !addText) {
    return '';
  }

  let sentence = 'Please prepare the order';
  if (withoutText && addText) {
    sentence += ` without ${withoutText} and add ${addText}`;
  } else if (withoutText) {
    sentence += ` without ${withoutText}`;
  } else {
    sentence += ` and add ${addText}`;
  }
  return `${sentence}. Thank you!`;
}
