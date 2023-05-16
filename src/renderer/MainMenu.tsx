/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-filename-extension */
import {
  Navigate,
  MemoryRouter as Router,
  useNavigate,
} from 'react-router-dom';
import { SetStateAction, useEffect, useState } from 'react';
import './App.css';

function LoadingScreen({ loadingMessage }: any) {
  return (
    <div id="LoadingScreen">
      <div className="LoadingScreenContent">
        <h1>{loadingMessage}</h1>
        <h2>Please wait</h2>
        <div className="Loader" />
      </div>
    </div>
  );
}

function OpenSystemCreateButton({ setOpenNewSystemSelection }: any) {
  return (
    <button
      type="button"
      id="OpenSystemCreateButton"
      onClick={() => {
        setOpenNewSystemSelection(true);
      }}
    >
      Create New System
    </button>
  );
}

function ListNewSystem({
  config,
  selectedNewSystem,
  setSelectedNewSystem,
}: any) {
  const [open, setOpen] = useState(false);
  console.log(config);
  console.log(selectedNewSystem);
  const { id, displayName } = config;
  const operatingSystem = config.freeformTags.OS;
  return (
    <li className="ConfigInfo" key={config.id}>
      <div className="InitialInfo">
        <span id={config.id}>
          <input
            type="radio"
            checked={selectedNewSystem.id === config.id}
            onChange={() =>
              setSelectedNewSystem({ id, displayName, operatingSystem })
            }
          />
          {displayName}
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
            <li>Memory: GB</li>
            <li>Storage: GB</li>
            <li>OCPUS: </li>
            <li>GPU: </li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

async function getSystemConfigs(setError: any) {
  const result = await window.electron.ipcRendererOCI.listSystemConfigurations(
    'list-system-configs'
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully retrieved system configs');
    return result.configs;
  }
  console.log('Error retrieving system configs');
  setError(result.error.message);
  return [];
}

function NewSystemSelection({
  selectedNewSystem,
  setSelectedNewSystem,
  setError,
  openNewSystemSelection,
}: any) {
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      setConfigs(await getSystemConfigs(setError));
    }
    fetchData();
  }, [openNewSystemSelection, setError]);
  return (
    <div id="Create System Select">
      <ul>
        {configs.map((config) => (
          <ListNewSystem
            config={config}
            selectedNewSystem={selectedNewSystem}
            setSelectedNewSystem={setSelectedNewSystem}
          />
        ))}
      </ul>
    </div>
  );
}

// needs improving
async function createSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  operatingSystem: string,
  setError: any,
  setLoading: any
) {
  console.log('Creating system: ', instanceConfigurationId);
  console.log('Display name: ', displayName);
  // make request to create system
  setLoading(`Creating System: ${displayName}`);
  window.electron.ipcRendererOCI.listenUpdate(
    'create-system-update',
    (event, message) => {
      console.log(message);
      if (message.includes('Exception')) {
        setLoading('');
        setError(message);
      } else {
        setLoading(message);
      }
    }
  );
  const system = await window.electron.ipcRendererOCI.createSystem(
    'create-system',
    instanceConfigurationId,
    displayName,
    operatingSystem
  );
  setLoading('');
}

function CreateSystemButton({
  selectedNewSystem,
  systemDisplayName,
  setError,
  setLoading,
}: any) {
  console.log(systemDisplayName);
  let name = '';
  const { id, displayName, operatingSystem } = selectedNewSystem;
  if (systemDisplayName === '') {
    name = displayName;
  } else {
    name = systemDisplayName;
  }
  return (
    <button
      type="button"
      onClick={() =>
        createSystemRequest(id, name, operatingSystem, setError, setLoading)
      }
      // id={selected}
      style={{ width: '51%' }}
    >
      Create Selected new System? : {name}
    </button>
  );
}

function CreateSystemForm({
  selectedNewSystem,
  setSelectedNewSystem,
  setError,
  setOpenNewSystemSelection,
  setLoading,
}: any) {
  const [displayName, setDisplayName] = useState('');
  return (
    <div id="CreateSystemForm">
      <div className="CreateSystemFormContent">
        <button
          type="button"
          aria-label='Close "Create System" form'
          className="CloseCreateSystemForm"
          onClick={() => {
            setOpenNewSystemSelection(false);
          }}
        >
          &times;
        </button>
        <h2>Create a new System</h2>
        <NewSystemSelection
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
          setError={setError}
        />
        {selectedNewSystem.id !== '' ? (
          <>
            <h4>
              You can change the Systems name below, or leave it default. Note:
              the name must be unique!
            </h4>
            <input
              type="text"
              id="displayName"
              name="displayName"
              placeholder={selectedNewSystem.displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
              }}
              style={{ width: '50%' }}
            />
            <br />
            <CreateSystemButton
              selectedNewSystem={selectedNewSystem}
              systemDisplayName={displayName}
              setError={setError}
              setLoading={setLoading}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

async function getUserSystems(setError: any, setRefreshing: any) {
  setRefreshing(true);
  const result = await window.electron.ipcRendererOCI.listUserSystems(
    'list-user-systems'
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully retrieved user systems');
    setRefreshing(false);
    return result.systems;
  }
  console.log('Error retrieving user systems');
  setError(result.error.message);
  setRefreshing(false);
  return [];
}

function ListSystem({ system, selected, setSelected }: any) {
  const [open, setOpen] = useState(false);
  const { id, displayName, lifecycleState } = system;
  let operatingSystem = '';
  try {
    operatingSystem = system.freeformTags.OS;
  } catch (e) {
    operatingSystem = 'Unknown';
  }
  return (
    <li className="ConfigInfo" key={id}>
      <div className="InitialInfo">
        <span id={displayName}>
          <input
            type="radio"
            checked={selected.displayName === displayName}
            onChange={() => {
              setSelected({
                id,
                displayName,
                lifecycleState,
                operatingSystem,
              });
              console.log(selected);
            }}
          />
          {displayName}: {lifecycleState}{' '}
          {lifecycleState === 'RUNNING'
            ? '🟢'
            : lifecycleState === 'STOPPED'
            ? '🟡'
            : '🔴'}
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
            <li>OS: {operatingSystem}</li>
            <li>Memory: {system.shapeConfig.memoryInGBs} GB</li>
            <li>
              OCPUs: {system.shapeConfig.ocpus}- ({' '}
              {system.shapeConfig.processorDescription})
            </li>
            <li>GPUs: {system.shapeConfig.gpus}</li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function SysSelection({ systems, selected, setSelected }: any) {
  return (
    <div id="UserSystemSelection">
      <h1>Select your System below</h1>
      <ul>
        {systems.map((system: any) => (
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

async function startSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  operatingSystem: string,
  setError: any,
  setLoading: any
) {
  console.log('start system request: ', instanceConfigurationId, displayName);
  setLoading(`Starting System: ${displayName}`);
  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'start-system-update',
    (event, message: String) => {
      console.log(message);
      if (message.includes('Exception')) {
        setLoading('');
        setError(message);
      } else {
        setLoading(message);
      }
    }
  );
  const system = await window.electron.ipcRendererOCI.startSystem(
    'start-system',
    instanceConfigurationId,
    displayName,
    operatingSystem
  );
  setLoading('');
}

async function reconnectSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  operatingSystem: string,
  setError: any,
  setLoading: any
) {
  console.log('Reconnecting system: ', displayName);
  setLoading(`Reconnecting to System: ${displayName}`);

  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'reconnect-system-update',
    (event, message: String) => {
      console.log(message);
      if (message.includes('Exception') || message.includes('Error')) {
        setLoading('');
        setError(message);
      } else {
        setLoading(message);
      }
    }
  );

  const system = await window.electron.ipcRendererOCI.reconnectSystem(
    'reconnect-system',
    instanceConfigurationId,
    displayName,
    operatingSystem
  );
  setLoading('');
}

async function deleteSystemRequest(
  instanceId: string,
  displayName: string,
  setError: any
) {
  console.log('Deleting system: ', instanceId);

  const system = await window.electron.ipcRendererOCI.terminateSystem(
    'terminate-system',
    displayName,
    instanceId
  );
  if (system.success === 'success') {
    // system up, connecting
    console.log(system.message);
  } else {
    console.log(system.error);
    setError(system.error);
  }
}

function StartSystemButton({ selected, setError, setLoading }: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        startSystemRequest(
          selected.id,
          selected.displayName,
          selected.operatingSystem,
          setError,
          setLoading
        )
      }
      id={selected.id}
    >
      Start <b>{selected.displayName}</b>?
    </button>
  );
}

function ReconnectSystemButton({ selected, setLoading, setError }: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        reconnectSystemRequest(
          selected.id,
          selected.displayName,
          selected.operatingSystem,
          setError,
          setLoading
        )
      }
      id={selected.id}
    >
      Reconnect to {selected.operatingSystem}?
    </button>
  );
}

function LogoutButton(setError: SetStateAction<any>) {
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
            setError(result.error.message);
            return null;
          })
          .catch((err) => console.log(err));
      }}
    >
      Logout
    </button>
  );
}

function DeleteSystemButton({ selected, setError }: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        deleteSystemRequest(selected.id, selected.displayName, setError)
      }
      id={selected.id}
      className="DeleteButton"
    >
      Delete <b>{selected.displayName}</b>?
    </button>
  );
}

function RefreshIcon() {
  return (
    <div className="RefreshIcon">
      <div className="Loader" />
    </div>
  );
}

export default function MainMenu({ ErrorPopup, error, setError }: any) {
  const [systems, setSystems] = useState([{}]);
  const [selected, setSelected] = useState({
    id: '',
    displayName: '',
    lifecycleState: '',
    os: '',
  });
  const [selectedNewSystem, setSelectedNewSystem] = useState({
    id: '',
    displayName: '',
    os: '',
  });
  const [openNewSystemSelection, setOpenNewSystemSelection] = useState(false);
  const [loading, setLoading] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      const response = await getUserSystems(setError, setRefreshing);
      setSystems(response);
    }
    fetchData();
  }, [setError]);

  // get user systems every minute
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!navigator.onLine) {
        window.electron.ipcRendererOCIauth
          .logout('logout')
          .then((result) => {
            console.log(result);
            if (result.success === 'true') {
              localStorage.removeItem('authenticated');
              return navigate('/');
            }
            console.log('Logout failed');
            setError(result.error.message);
            return null;
          })
          .catch((err) => console.log(err));
      } else {
        const response = await getUserSystems(setError, setRefreshing);
        setSystems(response);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [setError]);

  if (systems.length > 0) {
    return (
      <div>
        {refreshing ? <RefreshIcon /> : null}
        {loading !== '' ? (
          <LoadingScreen loadingMessage={loading} />
        ) : (
          <div>
            {error !== '' ? (
              <ErrorPopup message={error} setError={setError} />
            ) : null}
            <SysSelection
              systems={systems}
              selected={selected}
              setSelected={setSelected}
              setError={setError}
              setLoading={setLoading}
            />
            <div className="ButtonContainer">
              {selected.id !== '' && selected.lifecycleState === 'RUNNING' ? (
                <ReconnectSystemButton
                  selected={selected}
                  setError={setError}
                  setLoading={setLoading}
                />
              ) : null}
              {selected.id !== '' && selected.lifecycleState !== 'RUNNING' ? (
                <StartSystemButton
                  selected={selected}
                  setError={setError}
                  setLoading={setLoading}
                />
              ) : null}
              <OpenSystemCreateButton
                setOpenNewSystemSelection={setOpenNewSystemSelection}
              />
              {openNewSystemSelection ? (
                <CreateSystemForm
                  selectedNewSystem={selectedNewSystem}
                  setSelectedNewSystem={setSelectedNewSystem}
                  setError={setError}
                  setOpenNewSystemSelection={setOpenNewSystemSelection}
                  setLoading={setLoading}
                />
              ) : null}
              <LogoutButton setError={setError} />
              {selected.id !== '' ? (
                <DeleteSystemButton selected={selected} setError={setError} />
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <h2>You have no systems yet, create a new one here!</h2>
      {error !== '' ? <ErrorPopup message={error} setError={setError} /> : null}
      {openNewSystemSelection ? (
        <CreateSystemForm
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
          setError={setError}
          setOpenNewSystemSelection={setOpenNewSystemSelection}
          setLoading={setLoading}
        />
      ) : null}
      <OpenSystemCreateButton
        setOpenNewSystemSelection={setOpenNewSystemSelection}
      />
      <LogoutButton setError={setError} />
    </div>
  );
}
