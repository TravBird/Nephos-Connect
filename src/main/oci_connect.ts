// OCI SDK
import * as common from 'oci-common';
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as keyManagement from 'oci-keymanagement';
import * as responses from 'oci-core/lib/response';
import * as fs from 'fs';
import os from 'os';
import { KeyObject, createPublicKey } from 'crypto';

const crypto = require('crypto');

const { subtle, cryptoKey } = require('crypto').webcrypto;

const filePath = `${os.homedir()}/.oci/config`;
const keyPath = `${os.homedir()}/.oci/keys/`;

export class OCIConnect {
  computeClient: core.ComputeClient;

  clientManagement: core.ComputeManagementClient;

  identityClient: identity.IdentityClient;

  keyClient: keyManagement.KmsManagementClient;

  keyCryptoClient: keyManagement.KmsCryptoClient;

  profileName: string;

  filePath: string;

  OCID: string;

  userCompartment: string;

  constructor(profileName: string) {
    this.profileName = profileName;
    this.filePath = filePath;
    this.OCID = '';
    this.userCompartment = '';

    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      this.filePath,
      this.profileName
    );

    // Create a new ComputeClient
    this.computeClient = new core.ComputeClient({
      authenticationDetailsProvider: provider,
    });

    this.clientManagement = new core.ComputeManagementClient({
      authenticationDetailsProvider: provider,
    });

    this.identityClient = new identity.IdentityClient({
      authenticationDetailsProvider: provider,
    });

    this.keyClient = new keyManagement.KmsManagementClient({
      authenticationDetailsProvider: provider,
    });

    this.keyCryptoClient = new keyManagement.KmsCryptoClient({
      authenticationDetailsProvider: provider,
    });

    this.keyClient.endpoint =
      'https://d5seppcnaaggq-management.kms.uk-london-1.oraclecloud.com';

    this.keyCryptoClient.endpoint =
      'https://d5seppcnaaggq-crypto.kms.uk-london-1.oraclecloud.com';
  }

  getProfileName() {
    return this.profileName;
  }

  getFilePath() {
    return this.filePath;
  }

  getOCID() {
    return this.OCID;
  }

  getUserCompartment() {
    return this.userCompartment;
  }

  setUserCompartment(compartment: string) {
    this.userCompartment = compartment;
  }

  // Instance functions
  async listUserInstances(): Promise<core.models.Instance[]> {
    try {
      // creating request object
      const request: core.requests.ListInstancesRequest = {
        compartmentId: this.userCompartment,
      };
      // sending request to client
      const response = await this.computeClient.listInstances(request);
      console.log(
        'Response recieved from list instances: ',
        response,
        '. Response Ended.'
      );
      return response.items;
    } catch (e) {
      console.log('Error in listUserInstances ', e);
      throw e;
    }
  }

  async startInstance(
    instanceId: string
  ): Promise<responses.InstanceActionResponse> {
    try {
      const request: core.requests.InstanceActionRequest = {
        instanceId,
        action: core.requests.InstanceActionRequest.Action.Start,
      };

      const response = await this.computeClient.instanceAction(request);

      console.log(
        'Response recieved from start instance: ',
        response,
        '. Response Ended.'
      );

      return response;
    } catch (e) {
      console.log('Error in startInstance ', e);
      throw e;
    }
  }

  async stopInstance(
    instanceId: string
  ): Promise<responses.InstanceActionResponse> {
    try {
      const request: core.requests.InstanceActionRequest = {
        instanceId,
        action: core.requests.InstanceActionRequest.Action.Softstop,
      };

      const response = await this.computeClient.instanceAction(request);

      console.log(
        'Response recieved from stop instance: ',
        response,
        '. Response Ended.'
      );

      return response;
    } catch (e) {
      console.log('Error in stopInstance ', e);
      throw e;
    }
  }

  // Teriminate instance
  async terminateInstance(
    instanceId: string
  ): Promise<responses.TerminateInstanceResponse> {
    try {
      const request: core.requests.TerminateInstanceRequest = {
        instanceId,
      };

      const response = await this.computeClient.terminateInstance(request);

      console.log(
        'Response recieved from terminate instance: ',
        response,
        '. Response Ended.'
      );

      return response;
    } catch (e) {
      console.log('Error in terminateInstance ', e);
      throw e;
    }
  }

  // Oracle Vault functions
  async importSSHKey(
    displayName: string,
    keyMaterial: any
  ): Promise<keyManagement.models.ImportKeyDetails> {
    const compartmentId =
      'ocid1.compartment.oc1..aaaaaaaa3dfdzabug5l5ymsmgctlnabppmn2umgloy5uja2ppwr2m4aqe6wq';
    try {
      const keyShape = {
        algorithm: keyManagement.models.KeyShape.Algorithm.Rsa,
        length: 512,
      };

      const wrappedImportKey = {
        keyMaterial,
        wrappingAlgorithm:
          keyManagement.models.WrappedImportKey.WrappingAlgorithm
            .RsaOaepAesSha256,
      };

      const importKeyDetails = {
        compartmentId,
        displayName,
        keyShape,
        wrappedImportKey,
      };

      const request: keyManagement.requests.ImportKeyRequest = {
        importKeyDetails,
      };
      const response = await this.keyClient.importKey(request);
      console.log(
        'Response recieved from import key: ',
        response,
        '. Response Ended.'
      );
      return response;
    } catch (e) {
      console.log('Error in importSSHKey ', e);
      throw e;
    }
  }

  async listSSHKeys(): Promise<keyManagement.models.KeySummary[]> {
    try {
      const request: keyManagement.requests.ListKeysRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaa3dfdzabug5l5ymsmgctlnabppmn2umgloy5uja2ppwr2m4aqe6wq',
      };

      const response = await this.keyClient.listKeys(request);

      console.log(
        'Response recieved from list keys: ',
        response,
        '. Response Ended.'
      );
      return response.items;
    } catch (e) {
      console.log('Error in listSSHKeys ', e);
      throw e;
    }
  }

  async getSSHKey(keyId: string): Promise<keyManagement.models.Key> {
    try {
      const request: keyManagement.requests.GetKeyRequest = {
        keyId,
      };

      const response = await this.keyClient.getKey(request);
      console.log(
        'Response recieved from get key: ',
        response,
        '. Response Ended.'
      );
      return response.key;
    } catch (e) {
      console.log('Error in getSSHKey ', e);
      throw e;
    }
  }

  async exportSSHKey(
    keyId: string,
    publicKey: string
  ): Promise<keyManagement.models.ExportedKeyData> {
    try {
      const algorithm =
        keyManagement.models.ExportKeyDetails.Algorithm.RsaOaepAesSha256;
      const request: keyManagement.requests.ExportKeyRequest = {
        exportKeyDetails: {
          keyId:
            'ocid1.key.oc1.uk-london-1.d5seppcnaaggq.abwgiljtmrijn5vv3y2snqhccdd262zdyrkxt7tip66ozmtyfucrk7m2jafq',
          algorithm,
          publicKey,
        },
      };

      const response = await this.keyCryptoClient.exportKey(request);

      response.exportedKeyData;

      const key = keyManagement.models.WrappedImportKey;
      console.log(
        'Response recieved from export key: ',
        response,
        '. Response Ended.'
      );
      return response.exportedKeyData;
    } catch (e) {
      console.log('Error in exportSSHKey ', e);
      throw e;
    }
  }

  // get Wrapping key
  async getWrappingKey(): Promise<keyManagement.models.WrappingKey> {
    try {
      const request: keyManagement.requests.GetWrappingKeyRequest = {};

      const response = await this.keyClient.getWrappingKey(request);

      console.log(
        'Response recieved from get wrapping key: ',
        response,
        '. Response Ended.'
      );
      return response.wrappingKey;
    } catch (e) {
      console.log('Error in getWrappingKey ', e);
      throw e;
    }
  }

  // Instance configuration functions
  // getting list of all instance configs
  async listInstanceConfigurations(): Promise<
    core.models.InstanceConfigurationSummary[]
  > {
    /**
     * Get the list of all instance configurations for the given compartment id.
     *
     * @param compartmentId: string
     * @return instanceConfigurations: core.models.InstanceConfigurationSummary[]
     *
     */
    try {
      // creating request object
      const request: core.requests.ListInstanceConfigurationsRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
      };
      // sending request to client
      const response = await this.clientManagement.listInstanceConfigurations(
        request
      );
      console.log(
        'Response recieved from get instance configuration: ',
        response,
        '. Response Ended.'
      );
      return response.items;
    } catch (e) {
      console.log('Error in getInstanceConfiguration ', e);
      throw e;
    }
  }

  async getInstanceConfig(
    configId: string
  ): Promise<core.models.InstanceConfiguration> {
    /**
     * Get the instance configuration details for the given instance configuration id.
     *
     * @param configId - The OCID of the instance configuration.
     * @return instanceConfiguration - The instance configuration details.
     * @throws Exception
     *
     * Example:
     *  const instanceConfiguration = await getInstanceConfig(configId);
     *
     * console.log('Instance Configuration Details: ', instanceConfiguration);
     *
     */
    try {
      // Create a request and dependent object(s).
      const getInstanceConfigurationRequest: core.requests.GetInstanceConfigurationRequest =
        {
          instanceConfigurationId: configId,
        };

      // Send request to the Client.
      const getInstanceConfigurationResponse =
        await this.clientManagement.getInstanceConfiguration(
          getInstanceConfigurationRequest
        );
      return getInstanceConfigurationResponse.instanceConfiguration;
    } catch (error) {
      console.log(`getInstanceConfiguration Failed with error  ${error}`);
      throw error;
    }
  }

  async launchInstanceFromConfig(
    instanceConfigurationId: string,
    publicKey: string
  ): Promise<core.models.Instance> {
    try {
      const instanceConfig = await this.getInstanceConfig(
        instanceConfigurationId
      );

      const { instanceDetails } = instanceConfig;

      instanceConfig.instanceDetails.launchDetails.metadata = {
        ssh_authorized_keys: `ssh-rsa ${publicKey}`,
      };

      const request: core.requests.LaunchInstanceConfigurationRequest = {
        instanceConfigurationId,
        instanceConfiguration: instanceDetails,
      };

      const response = await this.clientManagement.launchInstanceConfiguration(
        request
      );

      return response;
    } catch (error) {
      console.log('Error in launchInstanceFromConfig ', error);
      throw error;
    }
  }

  // User management functions
  async addApiKeyToUser(key: string, user: string) {
    try {
      const apiKey: identity.models.CreateApiKeyDetails = {
        key,
      };
      const request: identity.requests.UploadApiKeyRequest = {
        createApiKeyDetails: apiKey,
        userId: user,
      };
      const response = await this.identityClient.uploadApiKey(request);

      return response;
    } catch (error) {
      console.log('Error in addApiKeyToUser ', error);
      throw error;
    }
  }

  async getUserOCID(user: string) {
    try {
      const request: identity.requests.ListUsersRequest = {
        compartmentId:
          'ocid1.tenancy.oc1..aaaaaaaax25zqrammapt7upslefqq3kv6dzilt6z55yobnf2cmrn3tcimgpa',
        identityProviderId:
          'ocid1.saml2idp.oc1..aaaaaaaace5zv3qqzb6ycrvbvmto4uhjyfmsrqkveiq4pa5rvh7jcjg7fpzq',
      };
      const response = await this.identityClient.listUsers(request);
      for (let i = 0; i < response.items.length; i++) {
        if (response.items[i].description === user) {
          this.OCID = response.items[i].id;
          return response.items[i].id;
        }
      }
      throw new Error('User not found');
    } catch (error) {
      console.log('Error in getUser ', error);
      throw error;
    }
  }

  // Compartment management functions
  // Check if compartment exists
  async findUserCompartment(profileName) {
    try {
      const compartmentName = profileName;
      const request: identity.requests.ListCompartmentsRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: compartmentName,
      };
      const response = await this.identityClient.listCompartments(request);
      if (response.items.length === 0) {
        return undefined;
      }
      return response.items[0];
    } catch (error) {
      console.log('Error in compartmentExists ', error);
      throw error;
    }
  }

  // Create a new compartment
  async createCompartment(profileName) {
    try {
      const compartmentName = profileName;
      const compartment: identity.models.CreateCompartmentDetails = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: compartmentName,
        description: `Nephos generated compartment for ${compartmentName}`,
      };
      const request: identity.requests.CreateCompartmentRequest = {
        createCompartmentDetails: compartment,
      };
      const response = await this.identityClient.createCompartment(request);
      return response;
    } catch (error) {
      console.log('Error in createCompartment ', error);
      throw error;
    }
  }

  // Group management functions
  // Check if group exists
  async groupExists() {
    try {
      const groupName = this.profileName;
      const request: identity.requests.ListGroupsRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: groupName,
      };
      const response = await this.identityClient.listGroups(request);
      if (response.items.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error in groupExists ', error);
      throw error;
    }
  }

  // Create a new group
  async createGroup() {
    try {
      const groupName = this.profileName;
      const group: identity.models.CreateGroupDetails = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: groupName,
        description: `Nephos generated group for ${groupName}`,
      };
      const request: identity.requests.CreateGroupRequest = {
        createGroupDetails: group,
      };
      const response = await this.identityClient.createGroup(request);
      return response;
    } catch (error) {
      console.log('Error in createGroup ', error);
      throw error;
    }
  }

  // Policy management functions
  // Check if policy exists
  async policyExists() {
    try {
      const policyName = this.profileName;
      const request: identity.requests.ListPoliciesRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: policyName,
      };
      const response = await this.identityClient.listPolicies(request);
      if (response.items.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error in policyExists ', error);
      throw error;
    }
  }
}

// Creates a new local profile in the config file
export function CreateProfile(
  email: string,
  user: string,
  fingerprint: string,
  tenancy: string,
  region: string,
  KeyFile: string
) {
  const config = `\r\n[${email}]
  user=${user}\r
  fingerprint=${fingerprint}\r
  tenancy=${tenancy}\r
  region=${region}\r
  key_file=${keyPath}${KeyFile}\r
  `;

  try {
    fs.appendFileSync(filePath, config);
    console.log('New profile added to config file');
    return true;
  } catch (e) {
    console.log('Error in CreateProfile: ', e);
    throw e;
  }
}

// Checks if a profile exists in the config file
export function PofileExists(profileName: string) {
  try {
    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      filePath,
      profileName
    );
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function GenerateKeys() {
  // generate key and fingerprint
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      (err: any, publicKey: any, privateKey: any) => {
        if (err) throw reject(err);
        const keyObject = createPublicKey(publicKey);
        const publicKeyDER = keyObject.export({
          type: 'spki',
          format: 'der',
        });
        const fingerprint = crypto
          .createHash('md5')
          .update(publicKeyDER)
          .digest('hex')
          .replace(/..\B/g, '$&:');

        resolve({ publicKey, privateKey, fingerprint });
      }
    );
  });
}

export async function DecryptWrappedKey(privateKey, encryptedKey) {
  // Decode the encoded wrapped data and convert it to hexadecimal format.
  const buf = Buffer.from(encryptedKey, 'base64');
  const bufString = buf.toString('hex');

  // Extract the wrapped temporary AES key. (The length of this first portion of the wrapped data is equal to the
  // length of the private RSA wrapping key.) -512 Bytes/1024 characters
  const wrappedAESKey = bufString.substring(0, 1024);

  // Extract the wrapped target key. (This second portion of the wrapped data is the software-protected master encryption key.)  /
  const wrappedTargetKey = bufString.substring(1024);

  // Decrypt the wrapped temporary AES key using the private RSA wrapping key.
  const decryptedAESKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(wrappedAESKey, 'hex')
  );

  // Decrypt the wrapped target key using the temporary AES key.
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    decryptedAESKey,
    Buffer.alloc(16, 0)
  );
  const decryptedTargetKey = decipher.update(
    Buffer.from(wrappedTargetKey, 'hex')
  );
  const targetKeyStrig = decryptedTargetKey.toString('hex');
  return targetKeyStrig;
}

export async function WrapKey2(wrappingPublicKey, targetKey) {
  // Generate a temporary AES key:
  const aesKey = crypto.randomBytes(32);

  // Wrap the temporary AES key with the public wrapping key using RSA-OAEP with SHA-256:
  const wrappedAESKey = crypto.publicEncrypt(
    {
      key: wrappingPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  // Generate hexadecimal of the temporary AES key material:
  const aesKeyString = aesKey.toString('hex');

  // If the RSA private key you want to import is in PEM format, convert it to DER:
  const privateKey = crypto.createPrivateKey(targetKey);
  const exportedPrivateKey = privateKey.export({
    type: 'pkcs8',
    format: 'der',
  });

  // Wrap your RSA private key with the temporary AES key:
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    aesKey,
    Buffer.alloc(16, 0)
  );
  const wrappedPrivateKey = cipher.update(exportedPrivateKey);
  const wrappedPrivateKeyString = wrappedPrivateKey.toString('hex');

  // Concatenate the wrapped temporary AES key and the wrapped RSA private key:
  const wrappedKey = wrappedAESKey.toString('hex') + wrappedPrivateKeyString;

  // Encode the concatenated wrapped data in base64:
  const wrappedKeyBase64 = Buffer.from(wrappedKey, 'hex').toString('base64');

  return wrappedKeyBase64;
}

export async function WrapKey(wrappingKey: string, targetKey: string) {
  const targetKeyObject = crypto.createPrivateKey(targetKey);
  const exportedTargetKey = targetKeyObject.export({
    type: 'pkcs8',
    format: 'der',
  });
  // import into cryptokey object
  const cryptoTargetkey = await subtle.importKey(
    'pkcs8',
    exportedTargetKey,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    []
  );

  // import Wrapping key to Crypto key object
  const wrappingKeyObject = crypto.createPublicKey(wrappingKey);
  const exportedWrappingKey = wrappingKeyObject.export({
    type: 'spki',
    format: 'der',
  });
  const cryptoWrappingKey = await subtle.importKey(
    'spki',
    exportedWrappingKey,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['wrapKey']
  );

  // Generate a random temporary AES key.
  const tempAESKey = await subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['wrapKey', 'unwrapKey']
  );

  // Wrap temporary AES key using the public RSA wrapping key.
  const wrappedAESKey = await subtle.wrapKey(
    'raw',
    tempAESKey,
    cryptoWrappingKey,
    'RSA-OAEP'
  );

  // Wrap target key using the temporary AES key.

  console.log(cryptoTargetkey);
  console.log(tempAESKey);

  const wrappedTargetKey = await subtle.wrapKey(
    'pkcs8',
    cryptoTargetkey,
    tempAESKey,
    {
      name: 'AES-GCM',
      iv: Buffer.alloc(16, 0),
    }
  );

  console.log('Wrapped AES key: ', wrappedAESKey);
  console.log('Wrapped target key: ', wrappedTargetKey);

  // Concatenate the encrypted temporary AES key and the encrypted target key.
  const wrappedKey = Buffer.concat([
    Buffer.from(wrappedAESKey),
    Buffer.from(wrappedTargetKey),
  ]);

  console.log('Wrapped key buffer: ', wrappedKey);

  // Encode the wrapped data in base64 format.
  const wrappedKeyBase64 = wrappedKey.toString('base64');

  console.log('Wrapped key base64: ', wrappedKeyBase64);

  return wrappedKeyBase64;
}
