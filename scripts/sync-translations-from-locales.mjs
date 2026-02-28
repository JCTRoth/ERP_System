#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:4000/graphql';
const fillMissingWithEnglish = process.argv.includes('--fill-missing-with-en');

const workspaceRoot = process.cwd();
const localesDir = path.join(workspaceRoot, 'apps/frontend/src/locales');

const locales = {
  en: JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8')),
  de: JSON.parse(fs.readFileSync(path.join(localesDir, 'de.json'), 'utf8')),
  fr: JSON.parse(fs.readFileSync(path.join(localesDir, 'fr.json'), 'utf8')),
  ru: JSON.parse(fs.readFileSync(path.join(localesDir, 'ru.json'), 'utf8')),
};

async function gql(query, variables = {}) {
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data;
}

function splitFullKey(fullKey) {
  const dot = fullKey.indexOf('.');
  if (dot <= 0 || dot === fullKey.length - 1) {
    return { namespace: 'common', keyName: fullKey };
  }
  return {
    namespace: fullKey.slice(0, dot),
    keyName: fullKey.slice(dot + 1),
  };
}

async function ensureKeyId(fullKey, keyMap) {
  const existingId = keyMap.get(fullKey);
  if (existingId) return existingId;

  const { namespace, keyName } = splitFullKey(fullKey);
  const data = await gql(
    `mutation CreateTranslationKey($input: CreateTranslationKeyInput!) {
      createTranslationKey(input: $input) { id keyName namespace }
    }`,
    { input: { namespace, keyName } }
  );

  const created = data.createTranslationKey;
  const createdFullKey = `${created.namespace}.${created.keyName}`;
  keyMap.set(createdFullKey, created.id);
  return created.id;
}

async function setTranslation(keyId, language, valueText) {
  await gql(
    `mutation SetTranslation($keyId: ID!, $language: String!, $valueText: String!) {
      setTranslation(input: { keyId: $keyId, language: $language, valueText: $valueText }) {
        id
      }
    }`,
    { keyId, language, valueText }
  );
}

async function main() {
  console.log(`Syncing translations to ${gatewayUrl}`);
  console.log(`fillMissingWithEnglish=${fillMissingWithEnglish}`);

  const keyData = await gql(`query { translationKeys { id keyName namespace } }`);
  const keyMap = new Map(
    keyData.translationKeys.map((k) => [`${k.namespace}.${k.keyName}`, k.id])
  );

  const fullKeys = Object.keys(locales.en);
  let createdKeys = 0;
  let updatedValues = 0;
  let skippedEmpty = 0;

  for (const fullKey of fullKeys) {
    const keyExists = keyMap.has(fullKey);
    const keyId = await ensureKeyId(fullKey, keyMap);
    if (!keyExists) createdKeys += 1;

    const englishValue = locales.en[fullKey];

    for (const language of ['en', 'de', 'fr', 'ru']) {
      let value = locales[language][fullKey];
      if ((!value || String(value).trim() === '') && fillMissingWithEnglish) {
        value = englishValue;
      }

      if (!value || String(value).trim() === '') {
        skippedEmpty += 1;
        continue;
      }

      await setTranslation(keyId, language, String(value));
      updatedValues += 1;
    }
  }

  console.log('Done');
  console.log(`Created keys: ${createdKeys}`);
  console.log(`Upserted translation values: ${updatedValues}`);
  console.log(`Skipped empty values: ${skippedEmpty}`);
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
