<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  extension-element-prefixes="atom"
>
  <!-- Set the character set -->
  <xsl:output method="html" encoding="utf-8" indent="yes" media-type="text/html; charset=utf-8" />

  <xsl:param name="html">
    <xsl:variable name="tmp" select="processing-instruction('xslt-param')[starts-with(., 'name=&quot;html&quot;')]"/>
    <xsl:variable name="value" select="substring-before(substring-after($tmp, 'value=&quot;'), '&quot;')" />
    <xsl:choose>
      <xsl:when test="$value != ''">
        <xsl:value-of select="$value" />
      </xsl:when>
      <xsl:otherwise>index.html</xsl:otherwise>
    </xsl:choose>
  </xsl:param>

  <xsl:variable name="HTML" select="document($html)/html" />
  <xsl:variable name="ROOT" select="/*" />

  <!-- Identity transform -->
  <xsl:template match="@*|node()">
    <xsl:param name="node" />
    <xsl:copy>
      <xsl:apply-templates select="@*|node()">
        <xsl:with-param name="node" select="$node" />
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="/*">
    <!-- Set the DOCTYPE targeting HTML5 -->
    <xsl:text disable-output-escaping='yes'>&lt;!DOCTYPE html></xsl:text>

    <html>
      <!-- Set default language to En. -->
      <xsl:attribute name="lang">en</xsl:attribute>
      <!-- Identity transforms the rest. -->
      <xsl:apply-templates select="$HTML/@*|$HTML/node()" />
    </html>
  </xsl:template>

  <!-- Render primary navigation -->
  <xsl:template match="nav[@role='navigation' and @aria-label='Primary']//ul">
    <xsl:param name="node" />
    <xsl:variable name="templates" select="./li" />

    <xsl:copy>
      <xsl:apply-templates select="@*"/>

      <xsl:for-each select="$ROOT/atom:entry">
        <xsl:sort
          select="string-length(atom:id) - string-length(translate(atom:id, '/', ''))"
          order="descending" data-type="number"
        />

        <xsl:apply-templates select="$templates[count(.//ul) = 0][1]">
          <xsl:with-param name="node" select="." />
        </xsl:apply-templates>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <!-- Interpolates attributes -->
  <xsl:template match="@*[contains(., '{{') and contains(., '}}')]">
    <xsl:param name="node"/>

    <xsl:variable name="name" select="name()"/>
    <xsl:variable name="prefix" select="'{'"/>
    <xsl:variable name="suffix" select="'}'"/>
    <xsl:variable name="text" select="."/>
    <xsl:variable name="attributeValue">
      <xsl:call-template name="interpolate">
        <xsl:with-param name="node" select="$node"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:choose>
      <!-- When the value is empty, do not add the attribute. -->
      <xsl:when test="normalize-space($attributeValue) = ''"/>
      <xsl:otherwise>
        <xsl:attribute name="{$name}">
          <xsl:value-of select="normalize-space($attributeValue)"/>
        </xsl:attribute>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Special case for Welcome page -->
  <xsl:template match="text()[contains(., '{{ content }}')]">
    <xsl:copy-of select="document('/404.html')" />
  </xsl:template>

  <!-- Interpolates text -->
  <xsl:template name="interpolate" match="text()">
    <xsl:param name="text" select="." />
    <xsl:param name="prefix" select="'{{'" />
    <xsl:param name="suffix" select="'}}'" />
    <xsl:param name="node" select="." />

    <xsl:choose>
      <xsl:when test="contains($text, $prefix)">
        <xsl:call-template name="interpolate">
          <xsl:with-param name="text" select="substring-before($text, $prefix)" />
          <xsl:with-param name="prefix" select="$prefix" />
          <xsl:with-param name="suffix" select="$suffix" />
          <xsl:with-param name="node" select="$node" />
        </xsl:call-template>

        <xsl:variable name="expression" select="substring-before(substring-after($text, $prefix), $suffix)" />

        <xsl:variable name="value">
          <xsl:call-template name="evaluate">
            <xsl:with-param name="context" select="$node"/>
            <xsl:with-param name="expression" select="normalize-space($expression)"/>
          </xsl:call-template>
        </xsl:variable>

        <xsl:value-of select="normalize-space($value)" disable-output-escaping="yes" />

        <xsl:call-template name="interpolate">
          <xsl:with-param name="text" select="substring-after(
            $text,
            concat($prefix, $expression, $suffix)
          )" />
          <xsl:with-param name="prefix" select="$prefix" />
          <xsl:with-param name="suffix" select="$suffix" />
          <xsl:with-param name="node" select="$node" />
        </xsl:call-template>

      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text" disable-output-escaping="yes" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Ignore curly braces inside inline scripts or styles. -->
  <xsl:template match="*[name() = 'script' or name() = 'style']/text()[contains(., '{{') and contains(., '}}')]">
    <xsl:value-of select="." disable-output-escaping="yes" />
  </xsl:template>

  <!-- Basic expression evaluator -->
  <xsl:template name="evaluate">
    <xsl:param name="context" />
    <xsl:param name="expression" />

    <xsl:choose>
      <xsl:when test="$expression = 'page.title'">
        <xsl:value-of select="'Welcome'" />
      </xsl:when>
      <xsl:when test="$expression = 'content'">
        <xsl:apply-templates select="$welcome" />
        <!-- <xsl:copy-of select="$welcome/" /> -->
      </xsl:when>
      <xsl:when test="$expression = 'href'">
        <xsl:value-of select="$context/*[@rel = 'self']/@href" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$context/*[local-name() = $expression]" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Normalize spaces in class attributes, so we can break Tailwind utilities in multiple lines. -->
  <xsl:template match="@class">
    <xsl:attribute name="class">
      <xsl:value-of select="normalize-space(.)" />
    </xsl:attribute>
  </xsl:template>

</xsl:stylesheet>
