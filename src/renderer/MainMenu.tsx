/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import startVM from './StartVM';

function closeCreateSystemForm() {
  document.getElementById('CreateSystemForm').style.display = 'none';
}

window.addEventListener('click', (event) => {
  const modal = document.getElementById('CreateSystemForm');

  if (event.target === modal) {
    closeCreateSystemForm();
  }
});

function OpenSystemCreateButton() {
  return (
    <button
      type="button"
      id="OpenSystemCreateButton"
      onClick={() => {
        document.getElementById('CreateSystemForm').style.display = 'block';
      }}
    >
      Create New System
    </button>
  );
}

function ListNewSystem({ config, selected, setSelected }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="ConfigInfo" key={config.displayName}>
      <div className="InitialInfo">
        <span id={config.displayName}>
          <input
            type="radio"
            checked={selected === config.displayName}
            onChange={() => setSelected(config.displayName)}
          />
          {config.displayName}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? '- Less Info' : '+ Advanced Info'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="AdditionalInfo">
          <h4>System Specs:</h4>
          <ul>
            <li>Memory: {config.shapeConfig.memoryInGBs} GB</li>
            <li>Storage: {config.shapeConfig.storageInGBs} GB</li>
            <li>OCPUS: {config.shapeConfig.ocpus}</li>
            <li>GPU: {config.shapeConfig.gpus}</li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

async function getSystemConfigs() {
  const result = await window.electron.ipcRendererOCI.listSystemConfigurations(
    'list-system-configs'
  );
  return result;
}

function NewSystemSelection({ selectedNewSystem, setSelectedNewSystem }) {
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      setConfigs(await getSystemConfigs());
    }
    fetchData();
  }, []);
  return (
    <div id="Create System Select">
      <ul>
        {configs.map((config) => (
          <ListNewSystem
            config={config}
            selected={selectedNewSystem}
            setSelected={setSelectedNewSystem}
          />
        ))}
      </ul>
    </div>
  );
}

function CreateSystemForm({ selectedNewSystem, setSelectedNewSystem }) {
  return (
    <div id="CreateSystemForm">
      <div className="CreateSystemFormContent">
        <span
          className="CloseCreateSystemForm"
          onClick={() => {
            closeCreateSystemForm();
          }}
        >
          &times;
        </span>
        <h2>Create a new System</h2>
        <NewSystemSelection
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
        />
      </div>
    </div>
  );
}

async function getUserSystems() {
  const result = await window.electron.ipcRendererOCI.listUserSystems(
    'list-user-systems'
  );
  return result;
}


function ListSystem({ system, selected, setSelected }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="ConfigInfo" key={system.displayName}>
      <div className="InitialInfo">
        <span id={system.displayName}>
          <input
            type="radio"
            checked={selected === system.displayName}
            onChange={() => setSelected(system.displayName)}
          />
          {system.displayName}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? '- Less Info' : '+ Advanced Info'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="AdditionalInfo">
          <h4>System Specs:</h4>
          <ul>
            <li>Memory: {system.shapeConfig.memoryInGBs} GB</li>
            <li>Storage: {system.shapeConfig.storageInGBs} GB</li>
            <li>OCPUS: {system.shapeConfig.ocpus}</li>
            <li>GPU: {system.shapeConfig.gpus}</li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function SysSelection({ systems, selected, setSelected }) {
  console.log(systems);
  systems.map((system) => console.log(system.displayName));
  return (
    <div id="User System Selection">
      <h1>Select your System below</h1>
      <ul>
        {systems.map((system) => (
          <ListSystem
            system={system}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

const createSystemRequest = (
  request: string,
  setError: any,
  setAwaiting: any
) => {
  setAwaiting(true);
  startVM(request)
    .then((result) => {
      setAwaiting(false);
      if (result === 'success') {
        return true;
      }
      setError(true);
      throw new Error('Error starting VM');
    })
    .catch((error) => {
      setAwaiting(false);
      setError(true);
    });
};

const startSystemRequest = (
  request: string,
  setError: any,
  setAwaiting: any
) => {
  setAwaiting(true);
  startVM(request)
    .then((result) => {
      setAwaiting(false);
      if (result === 'success') {
        return true;
      }
      setError(true);
      throw new Error('Error starting VM');
    })
    .catch((error) => {
      setAwaiting(false);
      setError(true);
    });
};

function StartSystemButton({ selected, awaiting, setAwaiting, setError }) {
  return (
    <button
      type="button"
      onClick={() => startSystemRequest(selected, setError, setAwaiting)}
      id={selected}
      disabled={awaiting}
    >
      Start {selected}?
    </button>
  );
}

function createSystem({ configs, selected, awaiting, setAwaiting, setError }) {
  const items = configs;

  // implement a for loop through configs
  let selectedConfig = '';
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].displayName === selected) {
      selectedConfig = items[i];
    }
  }
  return (
    <button
      type="button"
      onClick={() => createSystemRequest(selectedConfig, setError, setAwaiting)}
      id={selected}
      disabled={awaiting}
    >
      Launch {selected}?
    </button>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      id="LogoutButton"
      onClick={() => {
        // localStorage.removeItem('authenticated');
        // setAuthenticated('false');
        window.electron.ipcRendererOCIauth
          .logout('logout')
          .then((result) => {
            console.log(result);
            if (result.success === 'true') {
              localStorage.removeItem('authenticated');
              return navigate('/');
            }
            console.log('Logout failed');
            return null;
          })
          .catch((err) => console.log(err));
      }}
    >
      Logout
    </button>
  );
}

export default function MainMenu() {
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const [systems, setSystems] = useState([{}]);
  const [selected, setSelected] = useState('');
  const [selectedNewSystem, setSelectedNewSystem] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      const response = await getUserSystems();
      setSystems(response);
    }
    fetchData();
  }, []);

  console.log(systems);

  if (systems.length > 0) {
    return (
      <div>
        <SysSelection
          systems={systems}
          selected={selected}
          setSelected={setSelected}
        />
        {selected !== '' ? (
          <StartSystemButton
            selected={selected}
            awaiting={awaiting}
            setAwaiting={setAwaiting}
            setError={setError}
          />
        ) : null}
        <OpenSystemCreateButton />
        <CreateSystemForm
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
        />
        <LogoutButton />
      </div>
    );
  }
  return (
    <div>
      <h2>You have no systems yet, create a new one here!</h2>
      <CreateSystemForm
        configs={systems}
        selected={selected}
        setSelected={setSelected}
      />
      <OpenSystemCreateButton />
    </div>
  );
}
