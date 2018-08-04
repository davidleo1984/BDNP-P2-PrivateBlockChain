const SHA256 = require('crypto-js/sha256');
const level = require('level');
const db = level('./mydb', { Encoding: JSON });

class Block {
  constructor(data) {
    (this.hash = ''),
      (this.height = 0),
      (this.body = data),
      (this.time = 0),
      (this.previousBlockHash = '');
  }
}

function getBlockHeight() {
  return new Promise((resolve, reject) => {
    let i = 0;
    db.createReadStream()
      .on('data', function (data) {
        i++;
      })
      .on('close', function () {
        resolve(i - 1);
      });
  });
}

function getBlock(blockHeight) {
  db.get(blockHeight, function (err, value) {
    if (err) return console.error(err);
    console.log(JSON.parse(value));
  });
}

function addBlock(newBlock) {
  getBlockHeight()
    .then(function (value) {
      // UTC timestamp
      newBlock.time = new Date()
        .getTime()
        .toString()
        .slice(0, -3);
      // Block height
      newBlock.height = value + 1;
      // previous block hash
      if (value > -1) {
        return db.get(value);
      } else {
        return Promise.resolve(-1);
      }
    })
    .then(function (ccc) {
      if (ccc !== -1) {
        newBlock.previousBlockHash = JSON.parse(ccc).hash;
      }
      // Block hash with SHA256 using newBlock and converting to a string
      newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

      // Adding block object to chain
      db.put(newBlock.height, JSON.stringify(newBlock), function (err) {
        if (err)
          return console.log(
            'Block ' + newBlock.height + ' submission failed',
            err
          );
        console.log('Block #' + newBlock.height + ' added.');
      });
    });
}

async function validateBlock(blockHeight) {
  let block = JSON.parse(await db.get(blockHeight));
  let blockHash = block.hash;
  block.hash = '';
  let validBlockHash = SHA256(JSON.stringify(block)).toString();
  if (blockHash === validBlockHash) {
    return true;
  } else {
    console.log(
      'Block #' +
      blockHeight +
      ' invalid hash:\n' +
      blockHash +
      '<>' +
      validBlockHash
    );
    return false;
  }
}

// Validate blockchain
async function validateChain() {
  let chainHeight = await getBlockHeight();
  let errorLog = [];
  for (var i = 0; i < chainHeight; i++) {
    // validate block
    if (!(await validateBlock(i))) errorLog.push(i);
    // compare blocks hash link
    let blockHash = JSON.parse(await db.get(i)).hash;
    let previousHash = JSON.parse(await db.get(i + 1)).previousBlockHash;
    if (blockHash !== previousHash) {
      errorLog.push(i);
    }
  }
  if (errorLog.length > 0) {
    console.log('Block errors = ' + errorLog.length);
    console.log('Blocks: ' + errorLog);
  } else {
    console.log('No errors detected');
  }
}
