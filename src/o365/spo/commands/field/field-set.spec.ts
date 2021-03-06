import commands from '../../commands';
import Command, { CommandValidate, CommandOption, CommandError } from '../../../../Command';
import config from '../../../../config';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth, { Site } from '../../SpoAuth';
const command: Command = require('./field-set');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.FIELD_SET, () => {
  let vorpal: Vorpal;
  let log: any[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    sinon.stub(command as any, 'getRequestDigestForSite').callsFake(() => Promise.resolve({ FormDigestValue: 'ABC' }));
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
      request.post
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.getAccessToken,
      auth.restoreAuth
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.FIELD_SET), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('calls telemetry', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {}, webUrl: 'https://contoso.sharepoint.com' }, () => {
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
    cmdInstance.action({ options: {}, webUrl: 'https://contoso.sharepoint.com' }, () => {
      try {
        assert.equal(telemetry.name, commands.FIELD_SET);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not logged in to a SharePoint site', (done) => {
    auth.site = new Site();
    auth.site.connected = false;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true }, webUrl: 'https://contoso.sharepoint.com' }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Log in to a SharePoint Online site first')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site column specified by name', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', name: 'MyColumn', Description: 'My column' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site column specified by id, pushing the changes to existing lists', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetById"><Parameters><Parameter Type="Guid">5d021339-4d62-4fe9-9d2a-c99bc56a157a</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My cool column</Parameter></SetProperty><SetProperty Id="668" ObjectPathId="663" Name="Title"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">true</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, webUrl: 'https://contoso.sharepoint.com', id: '5d021339-4d62-4fe9-9d2a-c99bc56a157a', Description: 'My cool column', Title: 'My column', updateExistingLists: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates list column specified by id, list specified by id', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetById"><Parameters><Parameter Type="Guid">03cef05c-ba50-4dcf-a876-304f0626085c</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Lists" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "270fa19e-f0f7-0000-37ae-1733ad1b6703"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.List",
            "_ObjectIdentity_": "270fa19e-f0f7-0000-37ae-1733ad1b6703|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c",
            "_ObjectVersion_": "6"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetById"><Parameters><Parameter Type="Guid">5d021339-4d62-4fe9-9d2a-c99bc56a157a</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Identity Id="5" Name="270fa19e-f0f7-0000-37ae-1733ad1b6703|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "fe0ea19e-7022-0000-37ae-1357e77e046c|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="fe0ea19e-7022-0000-37ae-1357e77e046c|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', listId: '03cef05c-ba50-4dcf-a876-304f0626085c', id: '5d021339-4d62-4fe9-9d2a-c99bc56a157a', Description: 'My column' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates list column specified by name, list specified by name', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByTitle"><Parameters><Parameter Type="String">My List</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Lists" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "270fa19e-f0f7-0000-37ae-1733ad1b6703"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.List",
            "_ObjectIdentity_": "270fa19e-f0f7-0000-37ae-1733ad1b6703|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c",
            "_ObjectVersion_": "6"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Identity Id="5" Name="270fa19e-f0f7-0000-37ae-1733ad1b6703|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "fe0ea19e-7022-0000-37ae-1357e77e046c|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="fe0ea19e-7022-0000-37ae-1357e77e046c|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, webUrl: 'https://contoso.sharepoint.com', listTitle: 'My List', name: 'MyColumn', Description: 'My column' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly escapes XML in list title', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByTitle"><Parameters><Parameter Type="String">My List&gt;</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Lists" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "270fa19e-f0f7-0000-37ae-1733ad1b6703"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.List",
            "_ObjectIdentity_": "270fa19e-f0f7-0000-37ae-1733ad1b6703|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c",
            "_ObjectVersion_": "6"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Identity Id="5" Name="270fa19e-f0f7-0000-37ae-1733ad1b6703|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "fe0ea19e-7022-0000-37ae-1357e77e046c|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="fe0ea19e-7022-0000-37ae-1357e77e046c|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:list:03cef05c-ba50-4dcf-a876-304f0626085c:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, webUrl: 'https://contoso.sharepoint.com', listTitle: 'My List>', name: 'MyColumn', Description: 'My column' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly escapes XML in field name', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'abc') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn&gt;</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', name: 'MyColumn>', Description: 'My column' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly escapes XML in field properties', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'abc') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column&gt;</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8231.1213", "ErrorInfo": null, "TraceCorrelationId": "b909a19e-5020-0000-37ae-17f800b4ea4c"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', name: 'MyColumn', Description: 'My column>' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles an error when the field specified by id doesn\'t exist', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetById"><Parameters><Parameter Type="Guid">5d021339-4d62-4fe9-9d2a-c99bc56a157a</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": {
              "ErrorMessage": "Invalid field name. {5d021339-4d62-4fe9-9d2a-c99bc56a157a} https:\u002f\u002fcontoso.sharepoint.com ",
              "ErrorValue": null,
              "TraceCorrelationId": "530fa19e-00d0-0000-3292-ba86430ff44a",
              "ErrorCode": -2147024809,
              "ErrorTypeName": "System.ArgumentException"
            },
            "TraceCorrelationId": "530fa19e-00d0-0000-3292-ba86430ff44a"
          }]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, webUrl: 'https://contoso.sharepoint.com', id: '5d021339-4d62-4fe9-9d2a-c99bc56a157a', Description: 'My cool column', Title: 'My column', updateExistingLists: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`Invalid field name. {5d021339-4d62-4fe9-9d2a-c99bc56a157a} https:\u002f\u002fcontoso.sharepoint.com `)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles an error when the field specified by title doesn\'t exist', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": {
              "ErrorMessage": "Column 'MyColumn' does not exist. It may have been deleted by another user.",
              "ErrorValue": null,
              "TraceCorrelationId": "4c0fa19e-b007-0000-37ae-1d177693b378",
              "ErrorCode": -2147024809,
              "ErrorTypeName": "System.ArgumentException"
            },
            "TraceCorrelationId": "4c0fa19e-b007-0000-37ae-1d177693b378"
          }]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', name: 'MyColumn', Description: 'My column' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`Column 'MyColumn' does not exist. It may have been deleted by another user.`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles an error when the list specified by id doesn\'t exist', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetById"><Parameters><Parameter Type="Guid">03cef05c-ba50-4dcf-a876-304f0626085c</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Lists" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": {
              "ErrorMessage": "List does not exist.\n\nThe page you selected contains a list that does not exist.  It may have been deleted by another user.",
              "ErrorValue": null,
              "TraceCorrelationId": "410fa19e-305f-0000-37ae-11555afd8e8a",
              "ErrorCode": -2130575322,
              "ErrorTypeName": "Microsoft.SharePoint.SPException"
            },
            "TraceCorrelationId": "410fa19e-305f-0000-37ae-11555afd8e8a"
          }]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', listId: '03cef05c-ba50-4dcf-a876-304f0626085c', id: '5d021339-4d62-4fe9-9d2a-c99bc56a157a', Description: 'My column' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`List does not exist.\n\nThe page you selected contains a list that does not exist.  It may have been deleted by another user.`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles an error when the list specified by title doesn\'t exist', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByTitle"><Parameters><Parameter Type="String">My List</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Lists" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": {
              "ErrorMessage": "List 'My List' does not exist at site with URL 'https:\u002f\u002fcontoso.sharepoint.com'.",
              "ErrorValue": null,
              "TraceCorrelationId": "380fa19e-e03c-0000-3292-b95a2fa0f656",
              "ErrorCode": -1,
              "ErrorTypeName": "System.ArgumentException"
            },
            "TraceCorrelationId": "380fa19e-e03c-0000-3292-b95a2fa0f656"
          }]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, webUrl: 'https://contoso.sharepoint.com', listTitle: 'My List', name: 'MyColumn', Description: 'My column' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`List 'My List' does not exist at site with URL 'https:\u002f\u002fcontoso.sharepoint.com'.`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles an error when updating the field failed', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (!opts.headers.authorization ||
          opts.headers.authorization.indexOf('Bearer ') !== 0 ||
          opts.headers['X-RequestDigest'] !== 'ABC') {
          return Promise.reject('Invalid request');
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="664" ObjectPathId="663" /><Query Id="665" ObjectPathId="663"><Query SelectAllProperties="false"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="663" ParentId="7" Name="GetByInternalNameOrTitle"><Parameters><Parameter Type="String">MyColumn</Parameter></Parameters></Method><Property Id="7" ParentId="5" Name="Fields" /><Property Id="5" ParentId="3" Name="Web" /><StaticProperty Id="3" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": null,
            "TraceCorrelationId": "7c0aa19e-1058-0000-37ae-14170affbedb"
          }, 664, {
            "IsNull": false
          }, 665, {
            "_ObjectType_": "SP.FieldText",
            "_ObjectIdentity_": "7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a"
          }]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="667" ObjectPathId="663" Name="Description"><Parameter Type="String">My column</Parameter></SetProperty><Method Name="UpdateAndPushChanges" Id="9000" ObjectPathId="663"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method></Actions><ObjectPaths><Identity Id="663" Name="7c0aa19e-1058-0000-37ae-14170affbedb|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:ff7a8065-9120-4c0a-982a-163ab9014179:web:e781d3dc-238d-44f7-8724-5e3e9eabcd6e:field:5d021339-4d62-4fe9-9d2a-c99bc56a157a" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([{
            "SchemaVersion": "15.0.0.0",
            "LibraryVersion": "16.0.8231.1213",
            "ErrorInfo": {
              "ErrorMessage": "An error has occurred",
              "ErrorValue": null,
              "TraceCorrelationId": "380fa19e-e03c-0000-3292-b95a2fa0f656",
              "ErrorCode": -1,
              "ErrorTypeName": "System.ArgumentException"
            },
            "TraceCorrelationId": "380fa19e-e03c-0000-3292-b95a2fa0f656"
          }]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, webUrl: 'https://contoso.sharepoint.com', name: 'MyColumn', Description: 'My column' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`An error has occurred`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('allows unknown options', () => {
    const allowUnknownOptions = command.allowUnknownOptions();
    assert.equal(allowUnknownOptions, true);
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

  it('fails validation if webUrl is not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { listId: '330f29c5-5c4c-465f-9f4b-7903020ae1ce', name: 'MyColumn' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if webUrl is not a valid SharePoint URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'invalid', listId: '330f29c5-5c4c-465f-9f4b-7903020ae1ce', name: 'MyColumn' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if neither id nor name are specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if both id and name are specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', id: '330f29c5-5c4c-465f-9f4b-7903020ae1ce', name: 'MyColumn' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if id is specified and is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', id: 'invalid' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if both listId and listTitle are specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '330f29c5-5c4c-465f-9f4b-7903020ae1ce', listTitle: 'My List', name: 'MyColumn' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if listId is specified and is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: 'invalid', name: 'MyColumn' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when webUrl and id are specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', id: '330f29c5-5c4c-465f-9f4b-7903020ae1ce' } });
    assert.equal(actual, true);
  });

  it('passes validation when webUrl, listId and name are specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listId: '330f29c5-5c4c-465f-9f4b-7903020ae1ce', name: 'MyColumn' } });
    assert.equal(actual, true);
  });

  it('passes validation when webUrl, listTitle and id are specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { webUrl: 'https://contoso.sharepoint.com', listTitle: 'My List', id: '330f29c5-5c4c-465f-9f4b-7903020ae1ce' } });
    assert.equal(actual, true);
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
    assert(find.calledWith(commands.FIELD_SET));
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
    cmdInstance.action({ options: { debug: true, webUrl: 'https://contoso.sharepoint.com' } }, (err?: any) => {
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