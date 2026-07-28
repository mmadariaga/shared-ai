'use strict';

function retireLegacyProjections(_records) {
  return { deleted: 0, preserved: 0, absent: 0 };
}

module.exports = { retireLegacyProjections };
