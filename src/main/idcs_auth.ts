const crypto = require('crypto');

const ClientID = 'f83387194eb14b238d024b3b1f82388b';
const ClientTenant = '573e8b608b474d48b6630b0b85b0e899';

const RedirectUri = 'http://localhost:3000/callback';

const ProfileId = '19935dc42dae4aedaf35fc1314a9ebe8';

export default class IdcsAuth {
  ClientID: string;

  ClientTenant: string;

  RedirectUri: string;

  ProfileId: string;

  Auth_Token: string;

  Access_Token: string;

  Nonce: string;

  State: string;

  constructor() {
    this.ClientID = ClientID;
    this.ClientTenant = ClientTenant;
    this.RedirectUri = RedirectUri;
    this.ProfileId = ProfileId;
    this.Auth_Token = '';
    this.Access_Token = '';

    this.Nonce = crypto.randomBytes(16).toString('base64');
    this.State = crypto.randomBytes(16).toString('base64');
  }

  getAuthURL() {
    return `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/authorize?client_id=${this.ClientID}&response_type=code&redirect_uri=${this.RedirectUri}&scope=openid approles groups&nonce=${this.Nonce}&state=${this.State}}`;
  }

  getAccessURL() {
    return `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/token?grant_type=authorization_code&code=${this.Auth_Token}&redirect_uri=${this.RedirectUri}&client_id=${this.ClientID}`;
  }

  getRegisterURL() {
    return `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/ui/v1/signup?profileid=${this.ProfileId}`;
  }

  getAccessToken() {
    return this.Access_Token;
  }

  setAuthToken(token: string) {
    this.Auth_Token = token;
  }

  setAccessToken(token: string) {
    this.Access_Token = token;
  }

  async accessTokenRequest() {
    // Making request to IDCS to exchange auth code for access token
    return fetch(
      `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `grant_type=authorization_code&code=${this.Auth_Token}&redirect_uri=${this.RedirectUri}&client_id=${this.ClientID}`,
      }
    )
      .then((res) => res.json())
      .then((body) => {
        return body;
      });
  }

  async userInfoRequest() {
    // Making request to IDCS to get user API keys
    console.log("Making request to get user's API keys with access token: ", this.Access_Token);
    return fetch(
      `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/userinfo`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Authorization: `Bearer ${this.Access_Token}`,
        },
      }
    )
    .then((res) => res.json())
      .then((body) => {
        return body;
      });
  }
}
