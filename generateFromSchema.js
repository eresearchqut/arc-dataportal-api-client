const {execSync} = require('child_process');

execSync(
    'openapi-generator-cli generate --skip-operation-example -i spec.yaml -g typescript-fetch ' +
    '--additional-properties=supportsES6=true,withInterfaces=true,platform=node,modelPropertyNaming=original,paramPropertyNaming=original ' +
    '-o generated/typescript-fetch',
    {stdio: 'inherit'}
);
