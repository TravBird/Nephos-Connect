// OCI SDK
import * as common from 'oci-common';
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as wr from 'oci-workrequests';
import * as fs from 'fs';
import os from 'os';

const filePath = `${os.homedir()}/.oci/config`;
const keyPath = `${os.homedir()}/.oci/keys/`;

export class OCIConnect {
  computeClient: core.ComputeClient;

  clientManagement: core.ComputeManagementClient;

  identityClient: identity.IdentityClient;

  profileName: string;

  filePath: string;

  constructor(profileName: string) {
    this.profileName = profileName;
    this.filePath = filePath;

    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      this.filePath,
      this.profileName
    );

    console.log('user: ', provider.getUser());
    console.log('fingerprint: ', provider.getFingerprint());
    console.log('privateKey: ', provider.getPrivateKey());

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
  }

  // function to get availible shapes
  async getShape(availabilityDomain): Promise<core.models.Shape[]> {
    try {
      const request: core.requests.ListShapesRequest = {
        availabilityDomain: availabilityDomain.name,
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
      };

      const response = await this.computeClient.listShapes(request);

      return response.items;
    } catch (e) {
      console.log('Error in getShape ', e);
      throw e;
    }
  }

  // getting list of all instance configs
  async listInstanceConfigurations(): Promise<
    core.models.InstanceConfigurationSummary[]
  > {
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

  async getInstanceConfig(selectedConfig) {
    try {
      // Create a request and dependent object(s).
      const getInstanceConfigurationRequest: core.requests.GetInstanceConfigurationRequest =
        {
          instanceConfigurationId: selectedConfig,
        };

      // Send request to the Client.
      const getInstanceConfigurationResponse =
        await this.clientManagement.getInstanceConfiguration(
          getInstanceConfigurationRequest
        );
      return getInstanceConfigurationResponse;
    } catch (error) {
      console.log(`getInstanceConfiguration Failed with error  ${error}`);
      throw error;
    }
  }

  async launchInstanceFromConfig(details): Promise<core.models.Instance> {
    try {
      // log the details
      console.log(details);
      const instanceDetails = await this.getInstanceConfig(details.config.id);

      console.log(instanceDetails);
      const request: core.requests.LaunchInstanceConfigurationRequest = {
        instanceConfigurationId: details.config.id,
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
        compartmentId: 'ocid1.tenancy.oc1..aaaaaaaax25zqrammapt7upslefqq3kv6dzilt6z55yobnf2cmrn3tcimgpa',
        identityProviderId:
          'ocid1.saml2idp.oc1..aaaaaaaace5zv3qqzb6ycrvbvmto4uhjyfmsrqkveiq4pa5rvh7jcjg7fpzq',
      };
      const response = await this.identityClient.listUsers(request);
      for (let i = 0; i < response.items.length; i++) {
        if (response.items[i].description === user) {
          return response.items[i].id;
        }
      }
      throw new Error('User not found');
    } catch (error) {
      console.log('Error in getUser ', error);
      throw error;
    }
  }
}

export function CreateProfile(
  email: string,
  user: string,
  fingerprint: string,
  tenancy: string,
  region: string,
  KeyFile: string
) {
  const config = `\r\n[${email}]
  user=${user}
  fingerprint=${fingerprint}
  tenancy=${tenancy}
  region=${region}
  key_file=${keyPath}${KeyFile}
  `;

  try {
    fs.appendFileSync(filePath, config);
    console.log('New profile added to config file');
  } catch (e) {
    console.log('Error in CreateProfile: ', e);
    throw e;
  }
}

export function PofileExists(profileName: string) {
  try {
    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      filePath,
      profileName
    );
    console.log(provider);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}
