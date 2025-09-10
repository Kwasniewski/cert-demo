#!/usr/bin/env ts-node

/**
 * Example: Creating a complete certificate hierarchy
 * 
 * This example demonstrates how to create:
 * 1. A root CA certificate
 * 2. An intermediate CA certificate signed by the root CA
 * 3. An end-entity certificate signed by the intermediate CA
 * 
 * Usage:
 *   npm run example:cert-creation
 */

import { CertificateTool } from '../src/certificate-tool';
import { KeyVaultConfig, AuthOptions } from '../src/types';

async function createCertificateHierarchy() {
  // Configuration - update these values for your environment
  const config: KeyVaultConfig = {
    vaultUrl: process.env.AZURE_KEY_VAULT_URL || 'https://your-keyvault.vault.azure.net/',
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  };

  const authOptions: AuthOptions = {
    useDefaultCredential: true // This will try multiple authentication methods
  };

  const tool = new CertificateTool(config, authOptions);

  try {
    console.log('🔐 Creating Certificate Hierarchy Example\n');

    // Step 1: Create Root CA
    console.log('1️⃣ Creating Root CA...');
    const rootCAResult = await tool.createRootCA({
      name: 'my-root-ca',
      subject: 'CN=My Root CA,O=My Company,L=My City,ST=My State,C=US',
      keySize: 4096,
      validityDays: 365, // 1 year
      pathLength: 1 // Allow one level of intermediate CAs
    });

    if (!rootCAResult.success) {
      throw new Error(`Failed to create root CA: ${rootCAResult.message}`);
    }
    console.log(`✅ Root CA created: ${rootCAResult.certificateName}`);
    console.log(`   Thumbprint: ${rootCAResult.thumbprint}\n`);

    // Step 2: Create Intermediate CA
    console.log('2️⃣ Creating Intermediate CA...');
    const intermediateCAResult = await tool.createIntermediateCA({
      name: 'my-intermediate-ca',
      subject: 'CN=My Intermediate CA,O=My Company,C=US',
      issuerCA: 'my-root-ca',
      keySize: 4096,
      validityDays: 365, // 1 year
      pathLength: 0 // No further intermediate CAs allowed
    });

    if (!intermediateCAResult.success) {
      throw new Error(`Failed to create intermediate CA: ${intermediateCAResult.message}`);
    }
    console.log(`✅ Intermediate CA created: ${intermediateCAResult.certificateName}`);
    console.log(`   Thumbprint: ${intermediateCAResult.thumbprint}\n`);

    // Step 3: Create End-Entity Certificate
    console.log('3️⃣ Creating End-Entity Certificate...');
    const endEntityResult = await tool.createEndEntityCertificate({
      name: 'my-website-cert',
      subject: 'CN=example.com,O=My Company,C=US',
      issuerCA: 'my-intermediate-ca',
      keySize: 2048,
      validityDays: 365, // 1 year
      san: ['example.com', 'www.example.com', 'api.example.com'],
      extendedKeyUsage: ['serverAuth', 'clientAuth']
    });

    if (!endEntityResult.success) {
      throw new Error(`Failed to create end-entity certificate: ${endEntityResult.message}`);
    }
    console.log(`✅ End-Entity Certificate created: ${endEntityResult.certificateName}`);
    console.log(`   Thumbprint: ${endEntityResult.thumbprint}`);
    console.log(`   SAN: example.com, www.example.com, api.example.com\n`);

    // Step 4: List all certificates
    console.log('4️⃣ Listing all certificates in Key Vault...');
    const certificates = await tool.listCertificates();
    console.log('📋 Certificates in Key Vault:');
    certificates.forEach((cert, index) => {
      console.log(`   ${index + 1}. ${cert}`);
    });

    console.log('\n🎉 Certificate hierarchy created successfully!');
    console.log('\nCertificate Chain:');
    console.log('   Root CA (my-root-ca)');
    console.log('   └── Intermediate CA (my-intermediate-ca)');
    console.log('       └── End-Entity Certificate (my-website-cert)');

  } catch (error) {
    console.error('❌ Error creating certificate hierarchy:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  createCertificateHierarchy().catch(console.error);
}

export { createCertificateHierarchy };
