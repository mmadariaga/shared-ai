'use strict';

// Call only after read-only reconciliation and exact continuation validation.
function authorize(request, receipt, file, save) {
  if (request.automatic_retry !== true) return;
  if (request.fallback) throw new Error('Changed relationships require renewed approval');
  if (receipt.automatic_retry_consumed) throw new Error('Automatic retry exhausted; explicit user continuation required');
  receipt.automatic_retry_consumed = true;
  save(file, receipt);
}

module.exports = { authorize };
