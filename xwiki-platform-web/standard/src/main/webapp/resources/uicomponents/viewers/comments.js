// Make sure the XWiki 'namespace' exists.

if (typeof(XWiki) == 'undefined') {
  XWiki = new Object();
}
// Make sure the viewers 'namespace' exists.
if (typeof(XWiki.viewers) == 'undefined') {
  XWiki.viewers = new Object();
}

/**
 * Javascript enhancements for the comments viewer.
 */
XWiki.viewers.Comments = Class.create({
  xcommentSelector : ".xwikicomment",
  /** Constructor. Adds all the JS improvements of the Comments area. */
  initialize : function() {
    if ($("commentform")) {
      // If the comments area is already visible, enhance it.
      this.startup();
    }
    if ($("Commentstab")) {
      this.container = $("Commentspane");
      this.generatorTemplate = "commentsinline.vm";
    } else if ($$(".main.layoutsubsection").size() > 0 && $$(".main.layoutsubsection").first().down("#commentscontent")) {
      this.container = $$(".main.layoutsubsection").first();
      this.generatorTemplate = "comments.vm";
    }
    // We wait for a notification for the AJAX loading of the Comments metadata tab.
    this.addTabLoadListener();
  },
  /** Enhance the Comments UI with JS behaviors. */
  startup : function() {
    this.form = $("commentform").up("form");
    this.loadIDs();
    this.addDeleteListener();
    this.addReplyListener();
    this.addSubmitListener();
    this.addCancelListener();
  },
  /**
   * Parse the IDs of the comments to obtain the xobject number.
   */
  loadIDs : function() {
    $$(this.xcommentSelector).each(function(item) {
      var elementId = item.id;
      item._x_number = elementId.substring(elementId.lastIndexOf("_") + 1) - 0;
    });
  },
  /**
   * Ajax comment deletion.
   * For all delete buttons, listen to "click", and make ajax request to remove the comment. Remove the corresponding
   * HTML element on succes (replace it with a small notification message). Display error message (alert) on failure.
   */
  addDeleteListener : function() {
    $$(this.xcommentSelector + ' a.delete').each(function(item) {
      item.observe('click', function(event) {
        item.blur();
        event.stop();
        if (item.disabled) {
          // Do nothing if the button was already clicked and it's waiting for a response from the server.
          return;
        } else if (confirm("$msg.get('core.viewers.comments.delete.confirm')")) { // "Are you sure you want to delete?"
          // Disable the button, to avoid a cascade of clicks from inpatient users
          item.disabled = true;
          // Make request to delete the comment object
          new Ajax.Request(item.href + (Prototype.Browser.Opera ? "" : "&ajax=1"), {
            // Success: delete de corresponding HTML element and notify the user
            onSuccess : function() {
              var comment = item.up(this.xcommentSelector);
              // If the form is inside this comment's reply thread, move it back to the bottom.
              if (this.form.descendantOf(comment.next('.commentthread'))) {
                this.resetForm();
              }
              comment.replace(this.createNotification("$msg.get('core.viewers.comments.commentDeleted')"));
              this.updateCount();
            }.bind(this),
            // Failure: inform the user why the deletion failed
            onFailure : function(response) {
              var failureReason = response.statusText;
              if (response.statusText == '' /* No response */ || response.status == 12031 /* In IE */) {
                failureReason = 'Server not responding';
              }
              alert("$msg.get('core.viewers.comments.delete.failed')" + failureReason);
            },
            // IE converts 204 status code into 1223...
            on1223 : function(response) {
              response.request.options.onSuccess(response);
            },
            // 0 is returned for network failures, except on IE where a strange large number (12031) is returned.
            on0 : function(response) {
              response.request.options.onFailure(response);
            },
            // In the end: re-inable the button
            onComplete : function() {
              item.disabled = false;
            }
          });
        }
      }.bindAsEventListener(this));
    }.bind(this));
  },
  /**
   * Inline reply: Move the form under the replied comment and update the hidden "replyto" field.
   */
  addReplyListener : function() {
    if (this.form) {
      $$(this.xcommentSelector + ' a.commentreply').each(function(item) {
        item.observe('click', function(event) {
          item.blur();
          event.stop();
          // If the form was already displayed as a reply, re-enable the Reply button for the old location
          if (this.form.up('.commentthread')) {
            this.form.up(".commentthread").previous(this.xcommentSelector).down('a.commentreply').show();
          }
          // Insert the form on top of that comment's discussion
          item.up(this.xcommentSelector).next('.commentthread').insert({'top' : this.form});
          // Set the replyto field to the replied comment's number
          this.form["XWiki.XWikiComments_replyto"].value = item.up(this.xcommentSelector)._x_number;
          // Clear the contents and focus the textarea
          this.form["XWiki.XWikiComments_comment"].value = "";
          this.form["XWiki.XWikiComments_comment"].focus();
          // Hide the reply button
          item.hide();
        }.bindAsEventListener(this));
      }.bind(this));
    } else {
      // If, for some reason, the form is missing, hide the reply functionality from the user
      $$(this.xcommentSelector + ' a.commentreply').each(function(item) {
        item.hide();
      });
    }
  },
  /**
   * When pressing Submit, check that the comment is not empty. Submit the form with ajax and update the whole comments
   * zone on success.
   */
  addSubmitListener : function() {
    if (this.form) {
      // Create a notification message to display to the user when the submit is being sent
      this.form.sendingNotification = this.createNotification("$msg.get('core.viewers.comments.add.inProgress')");
      this.form.sendingNotification.hide();
      this.form.insert(this.form.sendingNotification);
      // Add listener for submit
      this.form.down("input[type='submit']").observe('click', function(event) {
        event.stop();
        if (this.form["XWiki.XWikiComments_comment"].value != "") {
          var formData = new Hash(this.form.serialize(true));
          formData.set('xredirect', window.docviewurl + '?xpage=xpart&vm=' + this.generatorTemplate);
          formData.unset('action_cancel');
          this.form.sendingNotification.show();
          this.form.disable();
          this.restartNeeded = false;
          new Ajax.Request(this.form.action, {
            method : 'post',
            parameters : formData,
            onSuccess : function () {
              this.restartNeeded = true;
            }.bind(this),
            onFailure : function (response) {
              var failureReason = response.statusText;
              if (response.statusText == '' /* No response */ || response.status == 12031 /* In IE */) {
                failureReason = 'Server not responding';
              }
              alert("$msg.get('core.viewers.comments.add.failed')" + failureReason);
            }.bind(this),
            on0 : function (response) {
              response.request.options.onFailure(response);
            },
            onComplete : function (response) {
              if (this.restartNeeded) {
                this.container.update(response.responseText);
                document.fire("xwiki:docextra:loaded", {
                  "id" : "Comments",
                  "element": this.container
                });
                this.updateCount();
              } else {
                this.form.enable();
                this.form.sendingNotification.hide();
              }
            }.bind(this)
          });
        }
      }.bindAsEventListener(this));
    }
  },
  /**
   * When pressing Cancel, reset the form.
   */
  addCancelListener : function() {
    if (this.form) {
      this.initialLocation = new Element("span", {className : "hidden"});
      this.form.insert({before: this.initialLocation});
      // If the form is inside a thread, as a reply form, move it back to the bottom.
      this.form.down("input[name='action_cancel']").observe('click', this.resetForm.bindAsEventListener(this));
    }
  },
  resetForm : function (event) {
    if (this.form.up('.commentthread')) {
      if (event) {
        event.stop();
      }
      // Show the comment's reply button
      this.form.up(".commentthread").previous(this.xcommentSelector).down('a.commentreply').show();
      // Put the form back to its initial location and clear the contents
      this.initialLocation.insert({after: this.form});
    }
    this.form["XWiki.XWikiComments_replyto"].value = "";
    this.form["XWiki.XWikiComments_comment"].value = "";
  },
  updateCount : function() {
    if ($("Commentstab") && $("Commentstab").down(".itemcount")) {
      $("Commentstab").down(".itemcount").update("$msg.get('docextra.extranb', ['__number__'])".replace("__number__", $$(this.xcommentSelector).size()));
    }
  },
  /**
   * Registers a listener that watches for the insertion of the Comments tab and triggers the enhancements.
   * After that, the listener removes itself, since it is no longer needed.
   */
  addTabLoadListener : function(event) {
    var listener = function(event) {
      if (event.memo.id == 'Comments') {
        this.startup();
      }
    }.bindAsEventListener(this);
    document.observe("xwiki:docextra:loaded", listener);
  },
  /**
   * Just a simple message box that is displayed at various events: comment deleted, sending comment...
   */
  createNotification : function(message) {
    var msg = new Element('div', {"class" : "notification" });
    msg.update(message);
    return msg;
  }
});
// ======================================
// Comment actions enhancements
document.observe('xwiki:dom:loaded', function() {
  new XWiki.viewers.Comments();
});