<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
    <xsl:output method="html"/>

    
    <xsl:template match="/class">
        <xsl:text disable-output-escaping="yes">&lt;!-- #BeginTemplate "template.dwt" --&gt;
        </xsl:text>
        <html>
            <head>
            <style type="text/css">
            </style>
                <xsl:text disable-output-escaping="yes">
                    &lt;!-- #BeginEditable "TITLE" --&gt;
                </xsl:text>
                <title><xsl:value-of select="@name"/> - Reference Documentation</title>
                <xsl:text disable-output-escaping="yes">
                    &lt;!-- #EndEditable --&gt;
                </xsl:text>
            </head>
            <body>
                <xsl:text disable-output-escaping="yes">
                    &lt;!-- #BeginEditable "BODY" --&gt;
                </xsl:text>
                <h1><xsl:value-of select="@name"/> - Reference Documentation</h1>

                <p><xsl:apply-templates select="description"/></p>

                <h2>Index of Methods</h2>
                <ul>
                    <li><a href="#Constructor"><xsl:value-of select="@name"/>() constructor</a></li>
                    <xsl:apply-templates select="method" mode="index"/>
                </ul>
                
                <xsl:if test="constant">
                    <h2>Constants</h2>
                    <table class="content">
                        <colgroup>
                            <col width="100" />
                            <col width="200" />
                            <col />
                        </colgroup>
                        <tr><th>Type</th><th>Name</th><th>Description</th></tr>
                        <xsl:for-each select="constant">
                            <tr><td><xsl:value-of select="@type"/></td><td><xsl:value-of select="@name"/></td><td><xsl:value-of select="."/></td></tr>
                        </xsl:for-each>
                    </table>
                </xsl:if>
                
                <xsl:if test="field">
                    <h2>Properties</h2>
                    <table class="content">
                        <colgroup>
                            <col width="100" />
                            <col width="120" />
                            <col />
                        </colgroup>
                        <tr><th>Type</th><th>Name</th><th>Description</th></tr>
                        <xsl:for-each select="field">
                            <tr><td><xsl:value-of select="@type"/></td><td><xsl:value-of select="@name"/></td><td><xsl:value-of select="."/></td></tr>
                        </xsl:for-each>
                    </table>
                </xsl:if>
                
                <xsl:if test="constructor">
                    <h2 id="Constructor">Constructor</h2>
                    <xsl:apply-templates select="constructor"/>
                </xsl:if>
                
                <xsl:apply-templates select="method" mode="full"/>

                <xsl:text disable-output-escaping="yes">
                    &lt;!-- #EndEditable --&gt;
                </xsl:text>
                
            </body>
        </html>
        <xsl:text disable-output-escaping="yes">&lt;!-- #EndTemplate --&gt;
        </xsl:text>
    </xsl:template>
    
    
    <xsl:template match="constructor">

        <h3>Prototype</h3>
        <xsl:apply-templates select="signature"/>

        <h3>Description</h3>
        <xsl:apply-templates select="description"/>

        <xsl:if test="argument">
            <xsl:call-template name="arguments"/>
        </xsl:if>
            
        <xsl:call-template name="exceptions"/>

        <h3>Example</h3>
        <pre><xsl:value-of select="example"/></pre>
    </xsl:template>

    
    <xsl:template match="method" mode="index">
        <li><a><xsl:attribute name="href">#<xsl:value-of select="@name"/></xsl:attribute><xsl:value-of select="@name"/>()</a></li>
    </xsl:template>
    
        
    <xsl:template match="method" mode="full">

        <h2><xsl:attribute name="id"><xsl:value-of select="@name"/></xsl:attribute><xsl:value-of select="@name"/>()</h2>

        <h3>Prototype</h3>
        <xsl:apply-templates select="signature"/>

        <h3>Description</h3>
        <xsl:apply-templates select="description"/>

        <xsl:if test="argument">
            <xsl:call-template name="arguments"/>
        </xsl:if>
        
        <h3>Return</h3>
        <table>
            <colgroup>
                <col width="100" />
                <col />
            </colgroup>
            <tr><td><code><xsl:value-of select="return/@type"/></code></td><td><xsl:value-of select="return/."/></td></tr>
        </table>
        
        <xsl:call-template name="exceptions"/>
        
        <h3>Example</h3>
        <pre><xsl:value-of select="example"/></pre>
    </xsl:template>

    
    <xsl:template name="arguments">
        <h3>Arguments</h3>
        <table class="content" >
            <colgroup>
                <col width="100" />
                <col width="100" />
                <col />
            </colgroup>
            <tr><th>Type</th><th>Name</th><th>Description</th></tr>
            <xsl:apply-templates select="argument"/>
        </table>
    </xsl:template>
    
    
    <xsl:template match="argument">
        <tr>
            <td>
                <code>
                    <xsl:choose>
                        <xsl:when test="@type = 'ByteString'">
                            <a><xsl:attribute name="href">bytestring.html</xsl:attribute>ByteString</a>
                        </xsl:when>
                        <xsl:when test="@type = 'ByteBuffer'">
                            <a><xsl:attribute name="href">bytebuffer.html</xsl:attribute>ByteBuffer</a>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="@type"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </code>
            </td>
            <td>
                <xsl:value-of select="@name"/>
            </td>
            <td>
                <xsl:call-template name="description"/>
            </td>
        </tr>
    </xsl:template>
    
    
    <xsl:template name="exceptions">
        <h3>Exceptions</h3>
        <table class="content">
            <colgroup>
                <col width="100" />
                <col width="200" />
                <col />
            </colgroup>
            <tr><th>Name</th><th>Value</th><th>Description</th></tr>
            <xsl:apply-templates select="exception"/>
        </table>
    </xsl:template>
    
    
    <xsl:template match="exception">
        <tr><td><xsl:value-of select="@name"/></td><td><xsl:value-of select="@value"/></td><td><xsl:value-of select="."/></td></tr>
    </xsl:template>
    
    
    <xsl:template match="signature">
      <p class="signature"><xsl:value-of select="."/></p>
    </xsl:template>

    
    <xsl:template match="description" name="description">
        <xsl:apply-templates/>
<!-- 
        <p><xsl:value-of select="."/></p>
		<xsl:copy-of select="./*"/>
-->
    </xsl:template>
    
    
    <xsl:template match="p">
        <p><xsl:apply-templates/></p>
    </xsl:template>
    
    
    <xsl:template match="a">
        <a><xsl:attribute name="href"><xsl:value-of select="@href" /></xsl:attribute><xsl:value-of select="."/></a>
    </xsl:template>

    
    <xsl:template match="b">
        <b><xsl:apply-templates/></b>
    </xsl:template>
    
</xsl:stylesheet>
