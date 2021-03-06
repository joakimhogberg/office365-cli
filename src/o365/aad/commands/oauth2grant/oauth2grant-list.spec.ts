import commands from '../../commands';
import Command, { CommandOption, CommandValidate, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../AadAuth';
const command: Command = require('./oauth2grant-list');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';
import { Service } from '../../../../Auth';

describe(commands.OAUTH2GRANT_LIST, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    vorpal = require('../../../../vorpal-init');
    log = [];
    cmdInstance = {
      log: (msg: string) => {
        log.push(msg);
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
    auth.service = new Service('https://graph.windows.net');
    telemetry = null;
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.get
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.ensureAccessToken,
      auth.restoreAuth
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.OAUTH2GRANT_LIST), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('calls telemetry', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert(trackEvent.called);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs correct telemetry event', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert.equal(telemetry.name, commands.OAUTH2GRANT_LIST);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not logged in to AAD Graph', (done) => {
    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = false;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Log in to Azure Active Directory Graph first')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves OAuth2 permission grants for the specified service principal (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/myorganization/oauth2PermissionGrants?api-version=1.6&$filter=clientId eq '141f7648-0c71-4752-9cdb-c7d5305b7e68'`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            value: [{
              "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
              "consentType": "AllPrincipals",
              "expiryTime": "9999-12-31T23:59:59.9999999",
              "objectId": "50NAzUm3C0K9B6p8ORLtIhpPRByju_JCmZ9BBsWxwgw",
              "principalId": null,
              "resourceId": "1c444f1a-bba3-42f2-999f-4106c5b1c20c",
              "scope": "Group.ReadWrite.All",
              "startTime": "0001-01-01T00:00:00"
            },
            {
              "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
              "consentType": "AllPrincipals",
              "expiryTime": "9999-12-31T23:59:59.9999999",
              "objectId": "50NAzUm3C0K9B6p8ORLtIvNe8tzf4ndKg51reFehHHg",
              "principalId": null,
              "resourceId": "dcf25ef3-e2df-4a77-839d-6b7857a11c78",
              "scope": "MyFiles.Read",
              "startTime": "0001-01-01T00:00:00"
            }]
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, clientId: '141f7648-0c71-4752-9cdb-c7d5305b7e68' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            objectId: '50NAzUm3C0K9B6p8ORLtIhpPRByju_JCmZ9BBsWxwgw',
            resourceId: '1c444f1a-bba3-42f2-999f-4106c5b1c20c',
            scope: 'Group.ReadWrite.All'
          },
          {
            objectId: '50NAzUm3C0K9B6p8ORLtIvNe8tzf4ndKg51reFehHHg',
            resourceId: 'dcf25ef3-e2df-4a77-839d-6b7857a11c78',
            scope: 'MyFiles.Read'
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves OAuth2 permission grants for the specified service principal', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/myorganization/oauth2PermissionGrants?api-version=1.6&$filter=clientId eq '141f7648-0c71-4752-9cdb-c7d5305b7e68'`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            value: [{
              "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
              "consentType": "AllPrincipals",
              "expiryTime": "9999-12-31T23:59:59.9999999",
              "objectId": "50NAzUm3C0K9B6p8ORLtIhpPRByju_JCmZ9BBsWxwgw",
              "principalId": null,
              "resourceId": "1c444f1a-bba3-42f2-999f-4106c5b1c20c",
              "scope": "Group.ReadWrite.All",
              "startTime": "0001-01-01T00:00:00"
            },
            {
              "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
              "consentType": "AllPrincipals",
              "expiryTime": "9999-12-31T23:59:59.9999999",
              "objectId": "50NAzUm3C0K9B6p8ORLtIvNe8tzf4ndKg51reFehHHg",
              "principalId": null,
              "resourceId": "dcf25ef3-e2df-4a77-839d-6b7857a11c78",
              "scope": "MyFiles.Read",
              "startTime": "0001-01-01T00:00:00"
            }]
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, clientId: '141f7648-0c71-4752-9cdb-c7d5305b7e68' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            objectId: '50NAzUm3C0K9B6p8ORLtIhpPRByju_JCmZ9BBsWxwgw',
            resourceId: '1c444f1a-bba3-42f2-999f-4106c5b1c20c',
            scope: 'Group.ReadWrite.All'
          },
          {
            objectId: '50NAzUm3C0K9B6p8ORLtIvNe8tzf4ndKg51reFehHHg',
            resourceId: 'dcf25ef3-e2df-4a77-839d-6b7857a11c78',
            scope: 'MyFiles.Read'
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('outputs all properties when output is JSON', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/myorganization/oauth2PermissionGrants?api-version=1.6&$filter=clientId eq '141f7648-0c71-4752-9cdb-c7d5305b7e68'`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            value: [{
              "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
              "consentType": "AllPrincipals",
              "expiryTime": "9999-12-31T23:59:59.9999999",
              "objectId": "50NAzUm3C0K9B6p8ORLtIhpPRByju_JCmZ9BBsWxwgw",
              "principalId": null,
              "resourceId": "1c444f1a-bba3-42f2-999f-4106c5b1c20c",
              "scope": "Group.ReadWrite.All",
              "startTime": "0001-01-01T00:00:00"
            },
            {
              "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
              "consentType": "AllPrincipals",
              "expiryTime": "9999-12-31T23:59:59.9999999",
              "objectId": "50NAzUm3C0K9B6p8ORLtIvNe8tzf4ndKg51reFehHHg",
              "principalId": null,
              "resourceId": "dcf25ef3-e2df-4a77-839d-6b7857a11c78",
              "scope": "MyFiles.Read",
              "startTime": "0001-01-01T00:00:00"
            }]
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, clientId: '141f7648-0c71-4752-9cdb-c7d5305b7e68', output: 'json' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
          "consentType": "AllPrincipals",
          "expiryTime": "9999-12-31T23:59:59.9999999",
          "objectId": "50NAzUm3C0K9B6p8ORLtIhpPRByju_JCmZ9BBsWxwgw",
          "principalId": null,
          "resourceId": "1c444f1a-bba3-42f2-999f-4106c5b1c20c",
          "scope": "Group.ReadWrite.All",
          "startTime": "0001-01-01T00:00:00"
        },
        {
          "clientId": "cd4043e7-b749-420b-bd07-aa7c3912ed22",
          "consentType": "AllPrincipals",
          "expiryTime": "9999-12-31T23:59:59.9999999",
          "objectId": "50NAzUm3C0K9B6p8ORLtIvNe8tzf4ndKg51reFehHHg",
          "principalId": null,
          "resourceId": "dcf25ef3-e2df-4a77-839d-6b7857a11c78",
          "scope": "MyFiles.Read",
          "startTime": "0001-01-01T00:00:00"
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles no OAuth2 permission grants for the specified service principal found', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/myorganization/oauth2PermissionGrants?api-version=1.6&$filter=clientId eq '141f7648-0c71-4752-9cdb-c7d5305b7e68'`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            value: []
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, clientId: '141f7648-0c71-4752-9cdb-c7d5305b7e68' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles API OData error', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      return Promise.reject({
        error: {
          'odata.error': {
            code: '-1, InvalidOperationException',
            message: {
              value: `Resource '' does not exist or one of its queried reference-property objects are not present`
            }
          }
        }
      });
    });

    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, clientId: 'b2307a39-e878-458b-bc90-03bc578531d6' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`Resource '' does not exist or one of its queried reference-property objects are not present`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('fails validation if the clientId option is not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: {} });
    assert.notEqual(actual, true);
  });

  it('fails validation if the clientId is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { clientId: '123' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when the clientId option specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { clientId: '6a7b1395-d313-4682-8ed4-65a6265a6320' } });
    assert.equal(actual, true);
  });

  it('supports debug mode', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying clientId', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--clientId') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('has help referring to the right command', () => {
    const cmd: any = {
      log: (msg: string) => { },
      prompt: () => { },
      helpInformation: () => { }
    };
    const find = sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    assert(find.calledWith(commands.OAUTH2GRANT_LIST));
  });

  it('has help with examples', () => {
    const _log: string[] = [];
    const cmd: any = {
      log: (msg: string) => {
        _log.push(msg);
      },
      prompt: () => { },
      helpInformation: () => { }
    };
    sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    let containsExamples: boolean = false;
    _log.forEach(l => {
      if (l && l.indexOf('Examples:') > -1) {
        containsExamples = true;
      }
    });
    Utils.restore(vorpal.find);
    assert(containsExamples);
  });

  it('correctly handles lack of valid access token', (done) => {
    Utils.restore(auth.ensureAccessToken);
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.reject(new Error('Error getting access token')); });
    auth.service = new Service('https://graph.windows.net');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Error getting access token')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });
});