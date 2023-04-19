/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';
import './App.css';

const defaultStyle = {
  transition: `opacity ${400}ms ease-in-out`,
  opacity: 0,
};

const transitionStyles = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exiting: { opacity: 0 },
  exited: { opacity: 0 },
};

export function Home({ isActive, onLoadingChoice, onRegisterChoice }) {
  const navigate = useNavigate();
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  return (
    <div className="Home">
      {isActive ? (
        <div className="LoginRegister">
          <button
            className="LoginButton"
            type="button"
            onClick={() => {
              window.electron.ipcRendererOCIauth
                .login_sso_create('oci-login-sso-create')
                .then((result) => {
                  if (result.success === 'true') {
                    // localStorage.setItem('authenticated', 'true');
                    setauthenticated('true');
                    navigate('/home');
                  }
                  // setLoginFailed(true);
                })
                .catch((err) => {
                  console.log(err);
                });
            }}
          >
            Login
          </button>
          <button
            className="LoginButton"
            type="button"
            onClick={() => onRegisterChoice({ activeState: 'Register' })}
          >
            Register
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Register({ isActive, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerFailed, setRegisterFailed] = useState(false);
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const navigate = useNavigate();
  return (
    <Transition in={isActive} timeout={1000}>
      {(state) => (
        <div
          style={{
            ...defaultStyle,
            ...transitionStyles[state],
          }}
        >
          <div>
            {isActive ? (
              <div className="FormContainer">
                <h1>Register</h1>
                <input
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
                <input
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => {
                    window.electron.ipcRendererOCIauth
                      .register('oci-register', username, password)
                      .then((result) => {
                        if (result.success === 'true') {
                          localStorage.setItem('authenticated', result);
                          setauthenticated('true');
                          navigate('/home');
                        }
                        setRegisterFailed(true);
                      });
                  }}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterFailed(false);
                    onBack({ activeState: 'Home' });
                  }}
                >
                  Back
                </button>
                <div className="detail_fail">
                  {registerFailed ? (
                    <h1>Registration Failed, please try again</h1>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Transition>
  );
}

export function Loading({ isActive }) {
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
