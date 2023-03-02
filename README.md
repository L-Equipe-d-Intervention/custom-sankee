# Artefact's Custom Sankey

## Installation

```bash
yarn install
```

## Build

```bash
yarn build
```

## Serve on localhost

```bash
# Create your SSL certificates if not done
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

# Serve on https. File is available @ https://127.0.0.1:8080/sankey.js
yarn serve
```
