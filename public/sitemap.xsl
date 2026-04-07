<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" omit-xml-declaration="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Sitemap — Aruru</title>
        <style>
          body{font-family:system-ui,-apple-system,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#1E1A16;background:#F7F3ED;}
          h1{font-size:1.35rem;font-weight:600;margin-bottom:.35rem;}
          .note{font-size:14px;color:#5C5248;margin-bottom:1.25rem;}
          table{width:100%;border-collapse:collapse;background:#FDFAF6;border:0.5px solid rgba(90,70,50,0.15);border-radius:8px;overflow:hidden;}
          th,td{padding:10px 12px;text-align:left;font-size:14px;}
          th{background:#F2E4D8;color:#7A3D22;font-weight:600;}
          td{border-top:0.5px solid rgba(90,70,50,0.12);}
          a{color:#C4714A;}
          a:hover{color:#7A3D22;}
          .foot{margin-top:1.5rem;font-size:14px;}
        </style>
      </head>
      <body>
        <h1>Site map</h1>
        <p class="note">This is a valid XML sitemap for search engines. Browsers often show “no style information” for raw XML; this page is only a human-friendly view. Google reads the underlying URLs normally.</p>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Change frequency</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="//*[local-name()='url']">
              <tr>
                <td>
                  <a href="{*[local-name()='loc']}">
                    <xsl:value-of select="*[local-name()='loc']"/>
                  </a>
                </td>
                <td><xsl:value-of select="*[local-name()='changefreq']"/></td>
                <td><xsl:value-of select="*[local-name()='priority']"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
        <p class="foot"><a href="/">← Aruru home</a></p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
