import commands from '../../commands';
import Command, { CommandValidate, CommandError, CommandOption } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth, { Site } from '../../SpoAuth';
const command: Command = require('./list-webhook-get');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.LIST_WEBHOOK_GET, () => {
  let vorpal: Vorpal;
  let log: any[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
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
    auth.site = new Site();
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
      auth.getAccessToken,
      auth.restoreAuth,
      request.get
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.LIST_WEBHOOK_GET), true);
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
        assert.equal(telemetry.name, commands.LIST_WEBHOOK_GET);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not connected to a SharePoint site', (done) => {
    auth.site = new Site();
    auth.site.connected = false;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com/sites/ninja', title: 'Documents' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Log in to a SharePoint Online site first')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves specified webhook of the given list if title option is passed (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`https://contoso.sharepoint.com/sites/ninja/_api/web/lists/GetByTitle('Documents')/Subscriptions('cc27a922-8224-4296-90a5-ebbc54da2e85')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            "clientState": null,
            "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
            "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
            "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
            "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
            "resourceData": null
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'abc';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        debug: true,
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listTitle: 'Documents',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85'
      }
    }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith({
          "clientState": null,
          "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
          "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
          "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
          "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
          "resourceData": null
        }));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves specified webhook of the given list if title option is passed', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`https://contoso.sharepoint.com/sites/ninja/_api/web/lists/GetByTitle('Documents')/Subscriptions('cc27a922-8224-4296-90a5-ebbc54da2e85')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            "clientState": null,
            "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
            "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
            "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
            "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
            "resourceData": null
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'abc';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        debug: false,
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listTitle: 'Documents',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85'
      }
    }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith({
          "clientState": null,
          "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
          "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
          "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
          "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
          "resourceData": null
        }));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves all webhooks of the specific list if id option is passed (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`https://contoso.sharepoint.com/sites/ninja/_api/web/lists(guid'dfddade1-4729-428d-881e-7fedf3cae50d')/Subscriptions('cc27a922-8224-4296-90a5-ebbc54da2e85')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            "clientState": null,
            "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
            "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
            "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
            "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
            "resourceData": null
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'abc';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        debug: true,
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listId: 'dfddade1-4729-428d-881e-7fedf3cae50d',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85'
      }
    }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith({
          "clientState": null,
          "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
          "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
          "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
          "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
          "resourceData": null
        }));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves all webhooks of the specific list if id option is passed', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`https://contoso.sharepoint.com/sites/ninja/_api/web/lists(guid'dfddade1-4729-428d-881e-7fedf3cae50d')/Subscriptions('cc27a922-8224-4296-90a5-ebbc54da2e85')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            "clientState": null,
            "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
            "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
            "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
            "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
            "resourceData": null
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'abc';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        debug: false,
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listId: 'dfddade1-4729-428d-881e-7fedf3cae50d',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85'
      }
    }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith({
          "clientState": null,
          "expirationDateTime": "2019-01-27T16:32:05.4610008Z",
          "id": "cc27a922-8224-4296-90a5-ebbc54da2e85",
          "notificationUrl": "https://mlk-document-publishing-fa-dev-we.azurewebsites.net/api/HandleWebHookNotification?code=jZyDfmBffPn7x0xYCQtZuxfqapu7cJzJo6puvruJiMUOxUl6XkxXAA==",
          "resource": "dfddade1-4729-428d-881e-7fedf3cae50d",
          "resourceData": null
        }));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  /*
  it('outputs 404 message when no webhooks found in verbose mode', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`https://contoso.sharepoint.com/sites/ninja/_api/web/lists(guid'dfddade1-4729-428d-881e-7fedf3cae50d')/Subscriptions('ab27a922-8224-4296-90a5-ebbc54da1981')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'abc';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        verbose: true,
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listId: 'dfddade1-4729-428d-881e-7fedf3cae50d',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85'
      }
    }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith('No webhooks found'));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });
*/

  it('correctly handles error when getting information for a site that doesn\'t exist', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`https://contoso.sharepoint.com/sites/ninja/_api/web/lists(guid'dfddade1-4729-428d-881e-7fedf3cae50d')/Subscriptions('ab27a922-8224-4296-90a5-ebbc54da1981')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.reject(new Error("404 - \"404 FILE NOT FOUND\""));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'abc';
    cmdInstance.action = command.action();
    cmdInstance.action({ 
      options: {
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listId: 'dfddade1-4729-428d-881e-7fedf3cae50d',
        id: 'ab27a922-8224-4296-90a5-ebbc54da1981'
      }
    }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('404 - "404 FILE NOT FOUND"')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('command correctly handles list get reject request', (done) => {

    const err = 'Invalid request';
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf('/_api/web/lists/GetByTitle(') > -1) {
        return Promise.reject(err);
      }

      return Promise.reject(err);
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();

    const actionTitle: string = 'Documents';

    cmdInstance.action({
      options: {
        debug: true,
        title: actionTitle,
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
      }
    }, (error?: any) => {
      try {
        assert.equal(JSON.stringify(error), JSON.stringify(new CommandError(err)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('uses correct API url when id option is passed', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf('/_api/web/lists(guid') > -1) {
        return Promise.resolve('Correct Url')
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();

    cmdInstance.action({
      options: {
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listId: 'dfddade1-4729-428d-881e-7fedf3cae50d',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85',
        debug: false,
      }
    }, () => {

      try {
        assert(1 === 1);
        done();
      }
      catch (e) {
        done(e);
      }
    });

  });

  it('fails validation if the url option not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: {} });
    assert.notEqual(actual, true);
  });

  it('fails validation if both list id and title options are not passed', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', id: 'cc27a922-8224-4296-90a5-ebbc54da2e85'} });
    assert.notEqual(actual, true);
  });

  it('fails validation if webhook id option is not passed', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF'} });
    assert.notEqual(actual, true);
  });

  it('fails validation if the url option is not a valid SharePoint site URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'foo', id: 'cc27a922-8224-4296-90a5-ebbc54da2e85' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if the url option is a valid SharePoint site URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF', id: 'cc27a922-8224-4296-90a5-ebbc54da2e85' } });
    assert(actual);
  });

  it('fails validation if the id option is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '12345', id: 'cc27a922-8224-4296-90a5-ebbc54da2e85' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if the listid option is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF', id: '12345' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if the id option is a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', id: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF' } });
    assert(actual);
  });

  it('passes validation if the listid option is a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF', id: 'cc27a922-8224-4296-90a5-ebbc54da2e85' } });
    assert(actual);
  });

  it('fails validation if both id and title options are passed', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF', listTitle: 'Documents', id: 'cc27a922-8224-4296-90a5-ebbc54da2e85' } });
    assert.notEqual(actual, true);
  });

  it('supports debug mode', () => {
    const options = (command.options() as CommandOption[]);
    let containsDebugOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsDebugOption = true;
      }
    });
    assert(containsDebugOption);
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
    assert(find.calledWith(commands.LIST_WEBHOOK_GET));
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
    Utils.restore(auth.getAccessToken);
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.reject(new Error('Error getting access token')); });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        webUrl: 'https://contoso.sharepoint.com/sites/ninja',
        listTitle: 'Documents',
        id: 'cc27a922-8224-4296-90a5-ebbc54da2e85',
        debug: false
      }
    }, (err?: any) => {
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