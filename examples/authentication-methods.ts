#!/usr/bin/env ts-node

/**
 * Example: Different Azure Identity authentication methods
 * 
 * This example demonstrates various ways to authenticate with Azure Key Vault
 * using Azure Identity instead of environment variables.
 */

import { KeyVaultClient } from '../src/keyvault-client';
import { KeyVaultConfig, AuthOptions } from '../src/types';

async function demonstrateAuthMethods() {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL || 'https://your-keyvault.vault.azure.net/';

  console.log('🔐 Azure Identity Authentication Methods Demo\n');

  // Method 1: DefaultAzureCredential (Recommended)
  console.log('1️⃣  DefaultAzureCredential (Recommended)');
  console.log('   Automatically tries multiple authentication methods in order:');
  console.log('   - Environment variables');
  console.log('   - Managed Identity');
  console.log('   - Azure CLI');
  console.log('   - Azure PowerShell');
  console.log('   - Visual Studio Code');
  console.log('   - Azure Developer CLI\n');

  try {
    const config1: KeyVaultConfig = { vaultUrl };
    const authOptions1: AuthOptions = { useDefaultCredential: true };
    const client1 = new KeyVaultClient(config1, authOptions1);
    const certificates1 = await client1.listCertificates();
    console.log(`   ✅ Success! Found ${certificates1.length} certificates\n`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // Method 2: Azure CLI Credential
  console.log('2️⃣  Azure CLI Credential');
  console.log('   Requires: az login\n');

  try {
    const config2: KeyVaultConfig = { vaultUrl };
    const authOptions2: AuthOptions = { useAzureCliCredential: true };
    const client2 = new KeyVaultClient(config2, authOptions2);
    const certificates2 = await client2.listCertificates();
    console.log(`   ✅ Success! Found ${certificates2.length} certificates\n`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // Method 3: Environment Credential
  console.log('3️⃣  Environment Credential');
  console.log('   Requires: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID\n');

  try {
    const config3: KeyVaultConfig = { vaultUrl };
    const authOptions3: AuthOptions = { useEnvironmentCredential: true };
    const client3 = new KeyVaultClient(config3, authOptions3);
    const certificates3 = await client3.listCertificates();
    console.log(`   ✅ Success! Found ${certificates3.length} certificates\n`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // Method 4: Managed Identity (only works in Azure)
  console.log('4️⃣  Managed Identity Credential');
  console.log('   Only works when running in Azure with managed identity enabled\n');

  try {
    const config4: KeyVaultConfig = { vaultUrl };
    const authOptions4: AuthOptions = { useManagedIdentity: true };
    const client4 = new KeyVaultClient(config4, authOptions4);
    const certificates4 = await client4.listCertificates();
    console.log(`   ✅ Success! Found ${certificates4.length} certificates\n`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  console.log('💡 Recommendation: Use DefaultAzureCredential for maximum flexibility!');
}

async function main() {
  if (!process.env.AZURE_KEY_VAULT_URL || process.env.AZURE_KEY_VAULT_URL.includes('your-keyvault')) {
    console.error('❌ Please set AZURE_KEY_VAULT_URL environment variable');
    console.log('   Example: export AZURE_KEY_VAULT_URL="https://your-keyvault.vault.azure.net/"');
    process.exit(1);
  }

  await demonstrateAuthMethods();
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
