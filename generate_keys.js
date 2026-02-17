const crypto = require('crypto');
const fs = require('fs');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
});

fs.writeFileSync('private.pem', privateKey.export({ type: 'pkcs1', format: 'pem' }));
fs.writeFileSync('public.pem', publicKey.export({ type: 'pkcs1', format: 'pem' }));

console.log('Keys generated: private.pem, public.pem');
