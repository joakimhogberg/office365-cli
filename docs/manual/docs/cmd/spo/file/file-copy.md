# spo file copy

Copies a file to another location

## Usage

```sh
spo file copy [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-u, --webUrl <webUrl>`|The URL of the site where the file is located
`-s, --sourceUrl <sourceUrl>`|Site-relative URL of the file to copy
`-t, --targetUrl <targetUrl>`|Server-relative URL where to copy the file
`--deleteIfAlreadyExists`|If a file already exists at the targetUrl, it will be moved to the recycle bin. If omitted, the copy operation will be canceled if the file already exists at the targetUrl location
`--allowSchemaMismatch`|Ignores any missing fields in the target document library and copies the file anyway
`-o, --output [output]`|Output type. `json|text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

!!! important
    Before using this command, log in to a SharePoint Online site, using the [spo login](../login.md) command.

## Remarks

To copy a file, you have to first log in to a SharePoint Online site using the [spo login](../login.md) command, eg. `spo login https://contoso.sharepoint.com`.

When you copy a file using the `spo file copy` command, only the latest version of the file is copied.

## Examples

Copy file to a document library in another site collection

```sh
spo file copy --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test2/Shared%20Documents/
```

Copy file to a document library in the same site collection

```sh
spo file copy --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test1/HRDocuments/
```

Copy file to a document library in another site collection. If a file with the same name already exists in the target document library, move it to the recycle bin

```sh
spo file copy --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test2/Shared%20Documents/ --deleteIfAlreadyExists
```

Copy file to a document library in another site collection. Will ignore any missing fields in the target destination and copy anyway

```sh
spo file copy --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test2/Shared%20Documents/ --allowSchemaMismatch
```

## More information

- Copy items from a SharePoint document library: [https://support.office.com/en-us/article/move-or-copy-items-from-a-sharepoint-document-library-00e2f483-4df3-46be-a861-1f5f0c1a87bc](https://support.office.com/en-us/article/move-or-copy-items-from-a-sharepoint-document-library-00e2f483-4df3-46be-a861-1f5f0c1a87bc)