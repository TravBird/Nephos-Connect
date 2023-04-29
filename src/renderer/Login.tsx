/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';

async function loginRequest(
  onLoading,
  onLoadingFirstTime,
  onLoadingLocalSetup,
  onLoadingError,
  navigate,
  setInternet,
  setLoadingMessageState
) {
  if (!navigator.onLine) {
    setInternet(false);
    return;
  }
  onLoading();
  console.log('Making oci-login-sso request');
  const ociLoginResult = await window.electron.ipcRendererOCIauth.login_sso(
    'oci-login-sso'
  );
  console.log(ociLoginResult);
  if (ociLoginResult.success === 'true') {
    // login successful
    console.log('Login successful');
    if (ociLoginResult.setupRequired === 'false') {
      // no setup required
      console.log('No setup required');
      localStorage.setItem('authenticated', 'true');
      navigate('/home');
      return;
    }
    // local setup required- missing config file
    if (ociLoginResult.message === 'local') {
      onLoadingLocalSetup();
      console.log('Making setup-local request');
      const ociLocalSetupResult =
        await window.electron.ipcRendererSetup.setupLocal('setup-local');
      console.log(ociLocalSetupResult);
      // local setup complete, checking if additional setup required
      if (ociLocalSetupResult.success === 'true') {
        if (ociLocalSetupResult.setupRequired === 'false') {
          // no additional setup required
          // attempting login again
          console.log('No additional setup required');
          setLoadingMessageState('Local Config setup complete! Logging you in');
          const postLocalSetupLoginResult =
            await window.electron.ipcRendererOCIauth.post_setup_login(
              'post-setup-login',
              ociLoginResult.userName
            );
          if (postLocalSetupLoginResult.success === 'true') {
            // login successful
            console.log('Login successful');
            localStorage.setItem('authenticated', 'true');
            await new Promise((f) => setTimeout(f, 10000));
            navigate('/home');
            return;
          }
          // login post setup failed
          console.log('Login post setup failed');
          setLoadingMessageState('Error: Login failed, please restart device and try again');
          return;
        }
        // additional setup required
        if (ociLocalSetupResult.setupRequired === 'true') {
          onLoadingFirstTime();
          console.log('Making setup-account request');
          const ociFirstTimeSetupResult =
            await window.electron.ipcRendererSetup.setupAccount(
              'setup-account'
            );
          console.log(ociFirstTimeSetupResult);

          if (ociFirstTimeSetupResult.success === 'true') {
            // setup complete
            // no additional setup required
            // attempting login again
            console.log('No additional setup required');
            setLoadingMessageState('Account setup complete! Logging you in');
            await new Promise((f) => setTimeout(f, 10000));
            const postLocalSetupLoginResult =
              await window.electron.ipcRendererOCIauth.post_setup_login(
                'post-setup-login',
                ociLoginResult.userName
              );
            if (postLocalSetupLoginResult.success === 'true') {
              // login successful
              console.log('Login successful');
              localStorage.setItem('authenticated', 'true');
              navigate('/home');
              return;
            }
            // login post setup failed
            console.log('Login post setup failed');
            setLoadingMessageState('Error: Login failed, please restart device and try again');
            return;
          }
          // setup failed
          console.log('Account setup failed');
          setLoadingMessageState('Error: Account setup failed, please restart device and try again');
          return;
        }
      }
      // local setup failed
      console.log('Local setup failed');
      setLoadingMessageState('Error: Local config setup failed, please restart device and try again');
      return;
    }
    // account setup required
    if (ociLoginResult.message === 'account') {
      onLoadingFirstTime();
      console.log('Making setup-account request');
      const ociFirstTimeSetupResult =
        await window.electron.ipcRendererSetup.setupAccount('setup-account');
      console.log(ociFirstTimeSetupResult);

      if (ociFirstTimeSetupResult.success === 'true') {
        // setup complete
        // no additional setup required
        // attempting login again
        console.log('No additional setup required');
        setLoadingMessageState('Account setup complete! Logging you in');
        await new Promise((f) => setTimeout(f, 10000));
        const postSetupLoginResult =
          await window.electron.ipcRendererOCIauth.post_setup_login(
            'post-setup-login',
            ociLoginResult.userName
          );
        if (postSetupLoginResult.success === 'true') {
          // login successful
          console.log('Login successful');
          localStorage.setItem('authenticated', 'true');
          navigate('/home');
          return;
        }
        // login post setup failed
        console.log('Login post setup failed');
        setLoadingMessageState('Error: Login failed, please restart device and try again');
        return;
      }
      // setup failed
      console.log('Account setup failed');
      setLoadingMessageState('Error: Account setup failed, please restart device and try again');
      return;
    }
  }
  // login failed
  console.log('Login failed');
  setLoadingMessageState('Error: Login failed, please restart device and try again');
}

export function Home({
  isActive,
  onLoading,
  onLoadingFirstTime,
  onLoadingLocalSetup,
  onLoadingError,
  internet,
  setInternet,
  setLoadingMessageState,
}) {
  const navigate = useNavigate();
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );

  useEffect(() => {
    if (!navigator.onLine) {
      console.log('No internet connection');
      setInternet(false);
      const buttons = document.getElementsByClassName('LoginButton');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
      }
    }
    setInternet(true);
    const buttons = document.getElementsByClassName('LoginButton');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
  }, [setInternet]);
  return (
    <div className="Home">
      {isActive ? (
        <>
          <div className="LoginRegister">
            <button
              className="LoginButton"
              type="button"
              onClick={() =>
                loginRequest(
                  onLoading,
                  onLoadingFirstTime,
                  onLoadingLocalSetup,
                  onLoadingError,
                  navigate,
                  setInternet,
                  setLoadingMessageState
                )
              }
            >
              Login
            </button>
            <button
              className="LoginButton"
              type="button"
              onClick={() => {
                if (!navigator.onLine) {
                  setInternet(false);
                  return;
                }
                window.electron.ipcRendererOCIauth
                  .register_sso('oci-register-sso')
                  .then((result) => {
                    if (result.success === 'true') {
                      return navigate('/');
                    }
                    return null;
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              }}
            >
              Register
            </button>
            <br />
          </div>
          {!internet ? (
            <div id="internetStatus">
              {' '}
              <h4 style={{ color: 'red' }}> No Internet Detected!</h4> Nephos
              cannot operate without a connection, please connect the device via
              Ethernet or use the WiFi options button in the top right{' '}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function Loading({ isActive, message }) {
  if (message !== '') {
    return (
      <div>
        {isActive ? (
          <>
            <h1>{message}</h1>
            <div className="Loader" />
          </>
        ) : null}
      </div>
    );
  }
  if (message.includes('error')) {
    return (
      <div>
        {isActive ? (
          <>
            <h2 style={{ color: 'red' }}>{message}</h2>
            <div className="Loader" />
          </>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      {isActive ? (
        <>
          <h1>Logging you in... Please Wait</h1>
          <div className="Loader" />
        </>
      ) : null}
    </div>
  );
}
