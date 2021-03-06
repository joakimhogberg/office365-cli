import commands from '../../commands';
import Command, { CommandValidate, CommandOption, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth, { Site } from '../../SpoAuth';
const command: Command = require('./externaluser-list');
import * as assert from 'assert';
import request from '../../../../request';
import config from '../../../../config';
import Utils from '../../../../Utils';

describe(commands.EXTERNALUSER_LIST, () => {
  let vorpal: Vorpal;
  let log: any[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    sinon.stub(command as any, 'getRequestDigest').callsFake(() => Promise.resolve({ FormDigestValue: 'ABC' }));
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    vorpal = require('../../../../vorpal-init');
    log = [];
    cmdInstance = {
      log: (msg: any) => {
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
      auth.ensureAccessToken,
      auth.restoreAuth,
      (command as any).getRequestDigest
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.EXTERNALUSER_LIST), true);
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
        assert.equal(telemetry.name, commands.EXTERNALUSER_LIST);
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
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Log in to a SharePoint Online site first')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not log in to a SharePoint tenant admin site', (done) => {
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`${auth.site.url} is not a tenant admin site. Log in to your tenant admin site and try again`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 tenant external users (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="109" ObjectPathId="108" /><Query Id="110" ObjectPathId="108"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="108" ParentId="105" Name="GetExternalUsers"><Parameters><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="105" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 tenant external users', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="109" ObjectPathId="108" /><Query Id="110" ObjectPathId="108"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="108" ParentId="105" Name="GetExternalUsers"><Parameters><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="105" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 50 tenant external users', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="109" ObjectPathId="108" /><Query Id="110" ObjectPathId="108"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="108" ParentId="105" Name="GetExternalUsers"><Parameters><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">50</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="105" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, pageSize: '50' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists second page of 50 tenant external users', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="109" ObjectPathId="108" /><Query Id="110" ObjectPathId="108"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="108" ParentId="105" Name="GetExternalUsers"><Parameters><Parameter Type="Int32">1</Parameter><Parameter Type="Int32">50</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="105" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, position: '1', pageSize: '50' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 tenant external users whose name match Vesa', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="109" ObjectPathId="108" /><Query Id="110" ObjectPathId="108"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="108" ParentId="105" Name="GetExternalUsers"><Parameters><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String">Vesa</Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="105" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filter: 'Vesa' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 tenant external users sorted descending by email', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="109" ObjectPathId="108" /><Query Id="110" ObjectPathId="108"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="108" ParentId="105" Name="GetExternalUsers"><Parameters><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">1</Parameter></Parameters></Method><Constructor Id="105" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, sortOrder: 'desc' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 external users for the specified site (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 external users for the specified site', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 50 external users for the specified site', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">50</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, pageSize: '50', siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists second page of 50 external users for the specified site', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">1</Parameter><Parameter Type="Int32">50</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, position: '1', pageSize: '50', siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 external users for the specified site whose name match Vesa', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String">Vesa</Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filter: 'Vesa', siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists first page of 10 external users for the specified site sorted descending by email', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String"></Parameter><Parameter Type="Enum">1</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "Dear Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, sortOrder: 'desc', siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: 'Dear Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('escapes XML in user input', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf('/_vti_bin/client.svc/ProcessQuery') > -1 &&
        opts.headers.authorization &&
        opts.headers.authorization.indexOf('Bearer ') === 0 &&
        opts.headers['X-RequestDigest'] &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="135" ObjectPathId="134" /><Query Id="136" ObjectPathId="134"><Query SelectAllProperties="false"><Properties><Property Name="TotalUserCount" ScalarProperty="true" /><Property Name="UserCollectionPosition" ScalarProperty="true" /><Property Name="ExternalUserCollection"><Query SelectAllProperties="false"><Properties /></Query><ChildItemQuery SelectAllProperties="false"><Properties><Property Name="DisplayName" ScalarProperty="true" /><Property Name="InvitedAs" ScalarProperty="true" /><Property Name="UniqueId" ScalarProperty="true" /><Property Name="AcceptedAs" ScalarProperty="true" /><Property Name="WhenCreated" ScalarProperty="true" /><Property Name="InvitedBy" ScalarProperty="true" /></Properties></ChildItemQuery></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="134" ParentId="131" Name="GetExternalUsersForSite"><Parameters><Parameter Type="String">https://contoso.sharepoint.com</Parameter><Parameter Type="Int32">0</Parameter><Parameter Type="Int32">10</Parameter><Parameter Type="String">&lt;Vesa</Parameter><Parameter Type="Enum">0</Parameter></Parameters></Method><Constructor Id="131" TypeId="{e45fd516-a408-4ca4-b6dc-268e2f1f0f83}" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "52e83b9e-4011-4000-c878-ab3e0977e9c2"
          }, 159, {
            "IsNull": false
          }, 160, {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 1, "UserCollectionPosition": -1, "ExternalUserCollection": {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [
                {
                  "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUser", "DisplayName": "<Vesa", "InvitedAs": "me@dearvesa.fi", "UniqueId": "100300009BF10C95", "AcceptedAs": "me@dearvesa.fi", "WhenCreated": "\/Date(2016,10,2,21,50,52,0)\/", "InvitedBy": null
                }
              ]
            }
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filter: '<Vesa', siteUrl: 'https://contoso.sharepoint.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{
          DisplayName: '<Vesa',
          InvitedAs: 'me@dearvesa.fi',
          UniqueId: '100300009BF10C95',
          AcceptedAs: 'me@dearvesa.fi',
          WhenCreated: new Date(2016, 10, 2, 21, 50, 52, 0),
          InvitedBy: null
        }]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles no results', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.resolve(JSON.stringify([
        {
          "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": null, "TraceCorrelationId": "5ae83b9e-30dd-4000-c878-aba6be0addde"
        }, 168, {
          "IsNull": false
        }, 169, {
          "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.GetExternalUsersResults", "TotalUserCount": 0, "UserCollectionPosition": -1, "ExternalUserCollection": {
            "_ObjectType_": "Microsoft.Online.SharePoint.TenantManagement.ExternalUserCollection", "_Child_Items_": [

            ]
          }
        }
      ]));
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles a generic error when setting tenant property', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.resolve(JSON.stringify([
        {
          "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7206.1204", "ErrorInfo": {
            "ErrorMessage": "File Not Found.", "ErrorValue": null, "TraceCorrelationId": "0ee83b9e-0000-4000-f938-f16a74e2f588", "ErrorCode": -2147024894, "ErrorTypeName": "System.IO.FileNotFoundException"
          }, "TraceCorrelationId": "0ee83b9e-0000-4000-f938-f16a74e2f588"
        }
      ]));
    });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('File Not Found.')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
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

  it('supports specifying page size', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--pageSize') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying page number', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--position') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying filter', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--filter') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying sort order', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--sortOrder') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying site URL', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--siteUrl') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('passes validation when no options have been specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: {} });
    assert.equal(actual, true);
  });

  it('fails validation when page size is not a number', () => {
    const actual = (command.validate() as CommandValidate)({ options: { pageSize: 'a' } });
    assert.notEqual(actual, true);
  });

  it('fails validation when page size is a negative number', () => {
    const actual = (command.validate() as CommandValidate)({ options: { pageSize: '-10' } });
    assert.notEqual(actual, true);
  });

  it('fails validation when page size is > 50', () => {
    const actual = (command.validate() as CommandValidate)({ options: { pageSize: '51' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when page size is 0 < x <= 50 (min)', () => {
    const actual = (command.validate() as CommandValidate)({ options: { pageSize: '1' } });
    assert.equal(actual, true);
  });

  it('passes validation when page size is 0 < x <= 50 (max)', () => {
    const actual = (command.validate() as CommandValidate)({ options: { pageSize: '50' } });
    assert.equal(actual, true);
  });

  it('fails validation when page number is not a number', () => {
    const actual = (command.validate() as CommandValidate)({ options: { position: 'a' } });
    assert.notEqual(actual, true);
  });

  it('fails validation when page number is a negative number', () => {
    const actual = (command.validate() as CommandValidate)({ options: { position: '-1' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when page number is a positive number', () => {
    const actual = (command.validate() as CommandValidate)({ options: { position: '1' } });
    assert.equal(actual, true);
  });

  it('fails validation when sort order contains invalid value', () => {
    const actual = (command.validate() as CommandValidate)({ options: { sortOrder: 'invalid' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when sort order is set to asc', () => {
    const actual = (command.validate() as CommandValidate)({ options: { sortOrder: 'asc' } });
    assert.equal(actual, true);
  });

  it('passes validation when sort order is set to desc', () => {
    const actual = (command.validate() as CommandValidate)({ options: { sortOrder: 'desc' } });
    assert.equal(actual, true);
  });

  it('fails validation when site URL is not a valid SharePoint URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { siteUrl: 'invalid' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when site URL is a valid SharePoint URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { siteUrl: 'https://contoso.sharepoint.com' } });
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
    assert(find.calledWith(commands.EXTERNALUSER_LIST));
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
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
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