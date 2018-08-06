const SHA256 = require('crypto-js/sha256');
const level = require('level');


class Block {
  constructor(data) {
    (this.hash = ''),
      (this.height = 0),
      (this.body = data),
      (this.time = 0),
      (this.previousBlockHash = '');
  }
}


class Blockchain {
  constructor() {
    this.database = level('./mydb', { Encoding: JSON });
    this.generateGenesisBlock();
  }

  async generateGenesisBlock() {
    try {
      await getBlockHeight();
    } catch (err) {
      await this.database.put('chainHeight', -1);
      this.addBlock(new Block("First block in the chain - Genesis block"));
    }
  }

  async getBlockHeight() {
    return await this.database.get('chainHeight');
  }

  getBlock(blockHeight) {
    this.database.get(blockHeight, function (err, value) {
      if (err) return console.error(err);
      console.log(JSON.parse(value));
    });
  }

  async  addBlock(newBlock) {
    //read current chainHeight
    let chainHeight = Number(await this.getBlockHeight());
    // Block height
    newBlock.height = chainHeight + 1;
    // previous block hash
    if (chainHeight > -1) {
      newBlock.previousBlockHash = JSON.parse((await this.database.get(chainHeight))).hash;
    }
    // UTC timestamp
    newBlock.time = new Date()
      .getTime()
      .toString()
      .slice(0, -3);
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
    this.database.put(newBlock.height, JSON.stringify(newBlock), function (err) {
      if (err)
        return console.log(
          'Block ' + newBlock.height + ' submission failed',
          err
        );
      console.log('Block #' + newBlock.height + ' added.');
    });
    // update chainHeight to levelDB
    this.database.put('chainHeight', newBlock.height, function (err) {
      if (err)
        return console.log('failed to updated chainHeight.');
    });
  }

  async  validateBlock(blockHeight) {
    let block = JSON.parse(await this.database.get(blockHeight));
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
  async  validateChain() {
    let chainHeight = Number(await this.getBlockHeight());
    let errorLog = [];
    for (var i = 0; i <= chainHeight; i++) {
      // validate block
      if (!(await this.validateBlock(i))) errorLog.push(i);
      // compare blocks hash link
      if (i < chainHeight) {
        let blockHash = JSON.parse(await this.database.get(i)).hash;
        let previousHash = JSON.parse(await this.database.get(i + 1)).previousBlockHash;
        if (blockHash !== previousHash) {
          errorLog.push(i);
        }
      }
    }
    if (errorLog.length > 0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: ' + errorLog);
    } else {
      console.log('No errors detected');
    }
  }
}


