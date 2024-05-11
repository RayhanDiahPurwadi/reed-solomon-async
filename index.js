const ReedSolomon = require('@ronomon/reed-solomon');

function createContext({
    dataShards, parityShards,
    shardSize = 65536,
    dataOffset = 0,
    parityOffset = 0,

    source = null,
    target = null
}) {
    if (source === null) {
        source = 0;
        for (let i = 0; i < dataShards; i++) source |= (1 << i);
    }
    if (target === null) {
        target = 0;
        for (let i = dataShards; i < dataShards + parityShards; i++) target |= (1 << i);
    } else {
        source = 0;
        for (let i = 0; i < dataShards + parityShards; i++) {
            if (target & (1 << i)) continue;
            source |= (1 << i);
        }
    }

    // TODO: Accept array for source and target

    return {
        context: ReedSolomon.create(dataShards, parityShards),
        dataShards,
        parityShards,
        shardSize,
        dataOffset,
        parityOffset,

        source,
        target
    };
}

function createBuffers(context) {
    const dataBuffer = Buffer.alloc(context.shardSize * context.dataShards);
    const dOffset = context.dataOffset;
    const dBufferSize = context.shardSize * context.dataShards;

    const parityBuffer = Buffer.alloc(context.shardSize * context.parityShards);
    const pOffset = context.parityOffset;
    const pBufferSize = context.shardSize * context.parityShards;

    return {
        dataBuffer, dOffset, dBufferSize,
        parityBuffer, pOffset, pBufferSize
    };
}

async function encode(ctx, buffers) {
    const {
        context,
        dataShards, parityShards,
        shardSize,
        
        source,
        target
    } = ctx;

    const {
        dataBuffer, dOffset, dBufferSize,
        parityBuffer, pOffset, pBufferSize
    } = buffers;

    return new Promise((resolve, reject) => {
        try {
            ReedSolomon.encode(
                context,
                source, target,

                dataBuffer, dOffset, dBufferSize,
                parityBuffer, pOffset, pBufferSize,

                function (err) {
                    if (err) return reject(err);
                    return resolve(buffers);
                }
            );
        } catch (err) {
            switch (err.toString()) {
                case 'Error: sources < k':
                    reject(new Error('Not enough shards or shards has been corrupted badly.'));
                    break;
                default:
                    reject(new Error('Unexpected error: ' + err));
                    break;
            }
        }
    });
}

module.exports = {
    createContext,
    createBuffers,
    encode,
};