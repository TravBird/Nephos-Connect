import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';
import { act } from 'react-test-renderer';
import icon from '../../assets/icon.svg';
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

function LoginRegisterChoice() {
  const [activeState, setActiveState] = useState('Home');
  const authenticated = localStorage.getItem('authenticated');
  const navigate = useNavigate();

  const Authenticated = () => {
    if (authenticated === 'true') {
      return navigate('/home');
    }
  };
  useEffect(() => {
    Authenticated();
  });
  return (
    <>
      <div className="LoginRegisterContainer">
        <Home
          isActive={activeState === 'Home'}
          onLoginChoice={() => setActiveState('Login')}
          onRegisterChoice={() => setActiveState('Register')}
        />
        <Login
          isActive={activeState === 'Login'}
          onBack={() => setActiveState('Home')}
        />
        <Register
          isActive={activeState === 'Register'}
          onBack={() => setActiveState('Home')}
        />
      </div>
    </>
  );
}

function Home({ isActive, onLoginChoice, onRegisterChoice }) {
  return (
    <div className="Home">
      {isActive ? (
        <div className="buttons">
          <button
            type="button"
            onClick={() => onLoginChoice({ activeState: 'Login' })}
          >
            Login
          </button>
          <button
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

function Login({ isActive, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginFailed, setLoginFailed] = useState(false);
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
                <h1>Login</h1>
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
                    window.electron.ipcRenderer
                      .login('login', username, password)
                      .then((result) => {
                        if (result.success === 'true') {
                          localStorage.setItem('authenticated', 'true');
                          setauthenticated('true');
                          navigate('/home');
                        }
                        setLoginFailed(true);
                      });
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginFailed(false);
                    onBack({ activeState: 'Home' });
                  }}
                >
                  Back
                </button>
                <div className="detail_fail">
                  {loginFailed ? <h1>Login Failed, please try again</h1> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Transition>
  );
}

function Register({ isActive, onBack }) {
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
                    window.electron.ipcRenderer
                      .register('register', username, password)
                      .then((result) => {
                        if (result.success === 'true') {
                          localStorage.setItem('authenticated', 'true');
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

const ConfigInfo = (config) => {
  const [open, setOpen] = useState(false);

  if (open === false) {
    return (
      <li>
      <div id={config.config.displayName} className="ConfigInfo">
          {config.config.displayName}
          <button
            onClick={() => {
              setOpen(true);
            }}
          >
          + More Info
          </button>
    </div>
    </li>
    );
  }
  return (
    <li>
    <div id={config.config.displayName} className="ConfigInfo">
        {config.config.displayName}
        <button
          onClick={() => {
            setOpen(false);
          }}
        >
        - Less Info
        </button>
  </div>
  <div className='AdditionalInfo'>
    <p>Compartment: {config.config.compartmentId}</p>
    <p>Availability Domain: {config.config.availabilityDomain}</p>
    <p>Shape: {config.config.shape}</p>
    <p>Image: {config.config.image}</p>
    <p>Subnet: {config.config.subnetId}</p>
    <p>SSH Public Key: {config.config.sshPublicKey}</p>
    <p>SSH Private Key: {config.config.sshPrivateKey}</p>
    <p>SSH Private Key Passphrase: {config.config.sshPrivateKeyPassphrase}</p>
    <p>SSH User: {config.config.sshUser}</p>
  </div>
  </li>
  );
};

function MainMenu() {
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('authenticated');
    setauthenticated('false');
    navigate('/');
  };
  const [shapes, setShapes] = useState([]);
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    window.electron.ipcRendererOCI
      .ociConnectTest('oci-connect-test', 'test')
      .then((result) => setShapes(result.items))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    window.electron.ipcRendererOCI
      .listInstanceConfigs('instance-configs', 'test')
      .then((result) => setConfigs(result.items))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div>
      <div id="OS Selection">
        <h1>Select your operating system below</h1>
        <ul>
          {configs.map((config) => (
            <ConfigInfo config={config} />
          ))}
        </ul>
      </div>
      <button type="button" id="LogoutButton" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRegisterChoice />} />
        <Route path="/home" element={<MainMenu />} />
      </Routes>
    </Router>
  );
}
