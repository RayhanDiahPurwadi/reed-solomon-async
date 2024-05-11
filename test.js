const fs = require('fs');
const ReedSolomon = require('.');

const data = 'abcdef';
const context = ReedSolomon.createContext({
    dataShards: 6,
    parityShards: 3,

    shardSize: 16
});
const buffers = ReedSolomon.createBuffers(context);

buffers.dataBuffer.write(data.toString(), context.dOffset, data.length);

function corruptData(ctx, buffers) {
    buffers.dataBuffer[buffers.dOffset + (ctx.shardSize * 0)] = 0;
    // buffers.dataBuffer[buffers.dOffset + (ctx.shardSize * 1)] = 0; // try uncommenting me (pair 1)
    buffers.parityBuffer[buffers.pOffset + (ctx.shardSize * 0)] = 0;
    buffers.parityBuffer[buffers.pOffset + (ctx.shardSize * 1)] = 0;
    // buffers.parityBuffer[buffers.pOffset + (ctx.shardSize * 2)] = 0; // pair 2
}

(async () => {
    const encoded = await ReedSolomon.encode(context, buffers);
    console.dir(encoded, { depth: null });
    console.log('Original data:', encoded.dataBuffer.toString());
    console.log('Parity data:', encoded.parityBuffer.toString());

    corruptData(context, encoded);
    console.dir(encoded, { depth: null });
    console.log('Corrupted data:', encoded.dataBuffer.toString());
    console.log('Corrupted parity:', encoded.parityBuffer.toString());
    
    let target = 0;
    target |= (1 << 0);
    // target |= (1 << 1); // try uncommenting me too (pair 1)
    target |= (1 << context.dataShards + 0);
    target |= (1 << context.dataShards + 1);
    // target |= (1 << context.dataShards + 2); // pair 2

    const recoveryCtx = ReedSolomon.createContext({
        dataShards: 6,
        parityShards: 3,

        shardSize: 16,

        target
    });

    try {
        const recovered = await ReedSolomon.encode(recoveryCtx, encoded);
        console.dir(recovered, { depth: null });
        console.log('Recovered data:', recovered.dataBuffer.toString());
    } catch (e) {
        console.error(e.toString());
    }
})();