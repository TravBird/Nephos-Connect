// OCI SDK
import * as common from 'oci-common';
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as wr from 'oci-workrequests';

import log from 'electron-log';

// Config File may need to be specified in future, especially when running on NephOS Natively
const provider: common.ConfigFileAuthenticationDetailsProvider =
  new common.ConfigFileAuthenticationDetailsProvider();

// Loading config Values
const tenancyId = provider.getTenantId();
const fingerprint = provider.getFingerprint();
const region = provider.getRegion();

// Create a new ComputeClient
const computeClient = new core.ComputeClient({
  authenticationDetailsProvider: provider,
});

const clientManagement = new core.ComputeManagementClient({
  authenticationDetailsProvider: provider,
});

const identityClient = new identity.IdentityClient({
  authenticationDetailsProvider: provider,
});

// Identity Calls

// Create new User in IAM: https://docs.oracle.com/en-us/iaas/api/#/en/identity/20160918/User/CreateUser
// may need to move this to IDCS instead

// login a user
export async function idcsLogin(): Promise<identity.models.User> {
  const request: identity.requests.CreateUserRequest = {
    createUserDetails: {
      compartmentId: tenancyId,
      name: 'test',
      description: 'test',
      email: 'test',
    },
  };

  const response = await identityClient.createUser(request);

  const userId = response.user.id;

  const pass = resetPassword(userId);

  return response.user;

}


export async function createUser(
  user_name,
  email,
  description
): Promise<identity.models.User> {
  const request: identity.requests.CreateUserRequest = {
    createUserDetails: {
      compartmentId: tenancyId,
      name: user_name,
      description,
      email,
    },
  };

  const response = await identityClient.createUser(request);

  const userId = response.user.id;

  const pass = resetPassword(userId);
  return response.user;
}

export async function resetPassword(
  userId
): Promise<identity.models.UIPassword> {
  try {
    const request: identity.requests.CreateOrResetUIPasswordRequest = {
      userId,
      // opcRetryToken: "EXAMPLE-opcRetryToken-Value"
    };
    const response = await identityClient.createOrResetUIPassword(request);
    return response.uIPassword;
  } catch (e) {
    console.log('Error in reset password ', e);
  }
}

async function getAvailabilityDomain(): Promise<identity.models.AvailabilityDomain> {
  try {
    const request: identity.requests.ListAvailabilityDomainsRequest = {
      compartmentId: tenancyId,
    };

    const response = await identityClient.listAvailabilityDomains(request);
    return response.items[0];
  } catch (e) {
    console.log('Error in getAvailabilityDomain ', e);
  }
}

const availabilityDomain = getAvailabilityDomain();

// Instance Calls

// function to get availible shapes
export async function getShape(
  availabilityDomain = availabilityDomain
): Promise<core.models.Shape[]> {
  try {
    const request: core.requests.ListShapesRequest = {
      availabilityDomain: availabilityDomain.name,
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
    };

    const response = await computeClient.listShapes(request);

    return response.items;
  } catch (e) {
    console.log('Error in getShape ', e);
  }
}

// getting list of all instance configs
export async function listInstanceConfigurations(): Promise<
  core.models.InstanceConfigurationSummary[]
> {
  try {
    // creating request object
    const request: core.requests.ListInstanceConfigurationsRequest = {
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
    };

    // sending request to client
    const response = await clientManagement.listInstanceConfigurations(request);

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

async function getInstanceConfig(selectedConfig) {
  try {
    // Create a request and dependent object(s).
    const getInstanceConfigurationRequest: core.requests.GetInstanceConfigurationRequest =
      {
        instanceConfigurationId: selectedConfig,
      };

    // Send request to the Client.
    const getInstanceConfigurationResponse =
      await clientManagement.getInstanceConfiguration(
        getInstanceConfigurationRequest
      );
    return getInstanceConfigurationResponse;
  } catch (error) {
    console.log(`getInstanceConfiguration Failed with error  ${error}`);
  }
}

export async function launchInstanceFromConfig(
  details
): Promise<core.models.Instance> {
  try {
    // log the details
    console.log(details);
    const instanceDetails = await getInstanceConfig(details.config.id);

    console.log(instanceDetails);
    const request: core.requests.LaunchInstanceConfigurationRequest = {
      instanceConfigurationId: details.config.id,
      instanceConfiguration: instanceDetails,
    };

    const response = await clientManagement.launchInstanceConfiguration(
      request
    );

    return response;
  } catch (e) {
    console.log('Error in launchInstanceFromConfig ', e);
  }
}
