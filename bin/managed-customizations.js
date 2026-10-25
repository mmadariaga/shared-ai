'use strict';

const CUSTOMIZATION_MARKER = '<!-- User customizations below this line -->';

// Only a standalone comment is a boundary. Keep the suffix byte-for-byte,
// including its first line ending, blank lines, and any later marker text.
function splitCustomizations(text) {
  const match = /^<!-- User customizations below this line -->(?=\r?$)/m.exec(text);
  if (!match) return { managed: text, suffix: '', hasMarker: false };
  const end = match.index + CUSTOMIZATION_MARKER.length;
  return { managed: text.slice(0, end), suffix: text.slice(end), hasMarker: true };
}

function preserveCustomizations(source, previous) {
  const current = splitCustomizations(source);
  const old = splitCustomizations(previous);
  return current.hasMarker && old.hasMarker ? current.managed + old.suffix : source;
}

module.exports = { CUSTOMIZATION_MARKER, splitCustomizations, preserveCustomizations };
