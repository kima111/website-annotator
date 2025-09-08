export function buildCssPath(el: Element): string {
  const parts: string[] = [];
  let node: any = el;
  while (node && node.nodeType === 1 && parts.length < 8) {
    let part = node.nodeName.toLowerCase();
    if (node.id) { parts.unshift(`#${cssEscape(node.id)}`); break; }
    const cls = (node.className || "").toString().trim().split(/\s+/).filter(Boolean);
    if (cls.length) part += "." + cls.slice(0,2).map(cssEscape).join(".");
    const siblingIndex = Array.from(node.parentNode?.children || []).filter((n:any)=>n.nodeName===node.nodeName).indexOf(node) + 1;
    if (siblingIndex>1) part += `:nth-of-type(${siblingIndex})`;
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

export function cssEscape(s: string){
  return s.replace(/([!"#$%&'()*+,./:;<=>?@\[\]^`{|}~ ])/g, "\\$1");
}