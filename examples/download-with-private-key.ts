#!/usr/bin/env ts-node

/**
 * Example: Download certificate with private key using Azure Identity
 * 
 * This example demonstrates how to use Azure Identity for authentication
 * instead of environment variables. It will automatically try multiple
 * authentication methods in order of preference.
 */

import { KeyVaultClient } from '../src/keyvault-client';
import { KeyVaultConfig, AuthOptions } from '../src/types';
import * as fs from 'fs';

async function main() {
  // Simplified configuration - only vault URL is required
  const config: KeyVaultConfig = {
    vaultUrl: process.env.AZURE_KEY_VAULT_URL || 'https://your-keyvault.vault.azure.net/'
  };

  // Authentication options - use DefaultAzureCredential (recommended)
  const authOptions: AuthOptions = {
    useDefaultCredential: true // This is the default, so it's optional
  };

  if (!config.vaultUrl || config.vaultUrl.includes('your-keyvault')) {
    console.error('❌ Please set AZURE_KEY_VAULT_URL environment variable');
    console.log('   Example: export AZURE_KEY_VAULT_URL="https://your-keyvault.vault.azure.net/"');
    process.exit(1);
  }

  try {
    // Create KeyVault client using Azure Identity
    console.log(' Creating Key Vault client with Azure Identity...');
    console.log('   Using DefaultAzureCredential which will try:');
    console.log('   1. Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)');
    console.log('   2. Managed Identity (if running in Azure)');
    console.log('   3. Azure CLI (if logged in)');
    console.log('   4. Azure PowerShell (if logged in)');
    console.log('   5. Visual Studio Code (if logged in)');
    console.log('   6. Azure Developer CLI (if logged in)');
    
    const client = new KeyVaultClient(config, authOptions);

    // List available certificates
    console.log('\n📋 Listing available certificates...');
    const certificates = await client.listCertificates();
    console.log(`Found ${certificates.length} certificates:`, certificates);

    if (certificates.length === 0) {
      console.log('⚠️  No certificates found in the Key Vault.');
      return;
    }

    // Use the first certificate as an example
    const certificateName = certificates[0];
    console.log(`\n🔍 Downloading certificate '${certificateName}' with private key...`);

    // Download certificate with private key
    const certificateData = await client.downloadCertificateWithPrivateKey(certificateName);

    console.log('✅ Certificate downloaded successfully!');
    console.log(` Certificate (PEM): ${certificateData.certificate.substring(0, 100)}...`);
    
    if (certificateData.privateKey) {
      console.log(` Private Key (PEM): ${certificateData.privateKey.substring(0, 100)}...`);
      
      // Save certificate and private key to files
      const certFileName = `${certificateName}-cert.pem`;
      const keyFileName = `${certificateName}-key.pem`;
      
      fs.writeFileSync(certFileName, certificateData.certificate);
      fs.writeFileSync(keyFileName, certificateData.privateKey);
      
      console.log(`💾 Certificate saved to: ${certFileName}`);
      console.log(`💾 Private key saved to: ${keyFileName}`);
    } else {
      console.log('⚠️  No private key found for this certificate');
    }

    // Also get certificate information
    console.log('\n📋 Certificate Information:');
    const certInfo = await client.getCertificateInfo(certificateName);
    console.log(`  Name: ${certInfo.name}`);
    console.log(`  Subject: ${certInfo.subject}`);
    console.log(`  Issuer: ${certInfo.issuer}`);
    console.log(`  Valid From: ${certInfo.notBefore.toISOString()}`);
    console.log(`  Valid To: ${certInfo.notAfter.toISOString()}`);
    console.log(`  Thumbprint: ${certInfo.thumbprint}`);

  } catch (error) {
    console.error('❌ Error:', error);
    
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
