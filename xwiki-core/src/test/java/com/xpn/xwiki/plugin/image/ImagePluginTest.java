/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package com.xpn.xwiki.plugin.image;

import java.io.File;

import org.jmock.Mock;
import org.xwiki.cache.CacheFactory;

import com.xpn.xwiki.XWiki;
import com.xpn.xwiki.XWikiContext;
import com.xpn.xwiki.doc.XWikiAttachment;

/**
 * Unit tests for the {@link com.xpn.xwiki.plugin.image.ImagePlugin} class.
 * 
 * @version $Id: $
 */
public class ImagePluginTest extends org.jmock.cglib.MockObjectTestCase
{

    private ImagePlugin plugin;

    protected void setUp()
    {
        XWikiContext context = new XWikiContext();
        Mock mockXWiki = mock(XWiki.class);
        mockXWiki.stubs().method("getTempDirectory").will(returnValue(new File("/tmp")));
        mockXWiki.stubs().method("Param").will(returnValue("10"));
        Mock mockCacheFactory = mock(CacheFactory.class);
        mockCacheFactory.expects(once()).method("newCache");
        mockXWiki.stubs().method("getLocalCacheFactory").will(returnValue((CacheFactory) mockCacheFactory.proxy()));
        context.setWiki((XWiki) mockXWiki.proxy());
        this.plugin = new ImagePlugin("image", ImagePlugin.class.getName(), context);
    }

    public void testIsSuportedImageFormat()
    {
        // supported
        assertTrue(plugin.isSupportedImageFormat("image/png"));
        assertTrue(plugin.isSupportedImageFormat("image/jpeg"));
        assertTrue(plugin.isSupportedImageFormat("image/gif"));
        assertTrue(plugin.isSupportedImageFormat("image/jpg"));
        assertTrue(plugin.isSupportedImageFormat("image/bmp"));

        // not supported
        assertFalse(plugin.isSupportedImageFormat("image/eps"));
        assertFalse(plugin.isSupportedImageFormat("image/tiff"));
    }

    public void testDownloadAttachmentWithUnsupportedFileType()
    {
        Mock attachmentMock = mock(XWikiAttachment.class);
        attachmentMock.stubs().method("getMimeType").will(returnValue("image/notsupported"));
        XWikiAttachment attachment = (XWikiAttachment) attachmentMock.proxy();
        assertSame(attachment, plugin.downloadAttachment(attachment, new XWikiContext()));
    }

}
