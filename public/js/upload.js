(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define('upload', ["jquery"], function (a0) {
      return (root['Upload'] = factory(a0));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("jquery"));
  } else {
    root['Upload'] = factory(jQuery);
  }
}(this, function ($) {

var IframeTransport = function(fileInput, uploadUrl, beforeUploadCallback, progressCallback, successCallback, errorCallback, afterUploadCallback) {
    this.fileInput = fileInput;
    this.name = fileInput.getAttribute("name");
    this.uploadUrl = uploadUrl;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.beforeUploadCallback = beforeUploadCallback;
    this.afterUploadCallback = afterUploadCallback;
    this.progressCallback = progressCallback;
    this.uuid = helper.generateUUID();
};

IframeTransport.prototype = {
    setProgressUrl: function(url) {
        this.progressUrl = url;
    },
    checkProgress: function(callback) {
        var self = this;
        this.progressUrl = helper.appendQueryParams(this.progressUrl, {
            "X-Progress-ID": this.uuid
        });
        this.xhr = new XMLHttpRequest();
        this.xhr.open("GET", this.progressUrl, true);
        this.xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            var response = eval(responseText);
            switch (response.state) {
              case "uploading":
                callback.call(self, response.received, response.size);
                setTimeout(function() {
                    self.xhr.send(null);
                }, interval);
                break;
            }
        };
        this.xhr.send(null);
    },
    send: function() {
        if (this.beforeUploadCallback.call(this) === false) {
            return;
        }
        var uploadUrl = helper.appendQueryParams(this.uploadUrl, {
            "X-Progress-ID": this.uuid
        });
        var iframe = document.createElement("iframe");
        iframe.src = "javascript:void(0);";
        iframe.style.display = "none";
        iframe.name = "iframeUpload";
        document.body.appendChild(iframe);
        var form = document.createElement("form");
        form.method = "post";
        form.enctype = "multipart/form-data";
        form.action = uploadUrl;
        form.target = "iframeUpload";
        form.style = "display:none;";
        document.body.appendChild(form);
        var clonedFileInput = this.fileInput.cloneNode(true), fileInputParent = this.fileInput.parentNode;
        form.appendChild(this.fileInput);
        fileInputParent.appendChild(clonedFileInput);
        this.fileInput = clonedFileInput;
        var self = this;
        iframe.addEventListener("load", function() {
            try {
                var body = iframe.contentDocument.body;
                var response = body.textContent || body.innerText;
                response = response ? JSON.parse(response) : {};
                self.successCallback.call(self, response);
            } catch (e) {
                self.errorCallback.call(self, e);
            }
            self.afterUploadCallback.call(self);
            iframe.parentNode.removeChild(iframe);
            form.parentNode.removeChild(form);
        });
        form.submit();
        if (this.progressUrl) {
            this.checkProgress(this.progressCallback);
        }
    }
};

var XhrTransport = function(fileInput, uploadUrl, beforeUploadCallback, progressCallback, successCallback, errorCallback, afterUploadCallback) {
    this.fileInput = fileInput;
    this.name = fileInput.getAttribute("name");
    this.uploadUrl = uploadUrl;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.beforeUploadCallback = beforeUploadCallback;
    this.afterUploadCallback = afterUploadCallback;
    this.progressCallback = progressCallback;
};

XhrTransport.prototype = {
    createXhr: function() {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            try {
                if (xhr.status !== 200) {
                    throw new Error("Server returns error code " + xhr.status);
                }
                var response = JSON.parse(xhr.responseText);
                self.successCallback.call(self, response);
            } catch (e) {
                self.errorCallback.call(self, e.message);
            }
            self.afterUploadCallback.call(self);
        };
        if ("upload" in xhr) {
            xhr.upload.onprogress = function(e) {
                self.progressCallback.call(self, e.loaded, e.total);
            };
        }
        return xhr;
    },
    send: function() {
        var xhr = [], file;
        var files = this.fileInput.files;
        for (var i = 0; i < files.length; i++) {
            if (this.beforeUploadCallback.call(this) === false) {
                break;
            }
            xhr[i] = this.createXhr();
            xhr[i].open("POST", this.uploadUrl, true);
            xhr[i].setRequestHeader("X-Requested-With", "XMLHttpRequest");
            var formData = new FormData();
            formData.append(this.name, files[i]);
            xhr[i].send(formData);
        }
    }
};

var helper = {
    extend: function() {
        var result = {};
        for (var i = 0; i < arguments.length; i++) {
            var obj = arguments[i];
            for (var key in obj) {
                result[key] = obj[key];
            }
        }
        return result;
    },
    generateUUID: function() {
        var uuid = "";
        for (var i = 0; i < 32; i++) {
            uuid += Math.floor(Math.random() * 16).toString(16);
        }
        return uuid;
    },
    appendQueryParams: function(url, params) {
        var queryString = [], queryMarkPos = url.indexOf("?");
        if (queryMarkPos >= 0) {
            queryString = url.substr(queryMarkPos + 1).split("&");
            url = url.substr(0, queryMarkPos);
        }
        for (var key in params) {
            queryString.push(key + "=" + encodeURIComponent(params[key]));
        }
        if (queryString.length > 0) {
            url += "?" + queryString.join("&");
        }
        return url;
    }
};

function Upload(element, options) {
    var self = this;
    this.fileInput = element;
    if (element.tagName !== "INPUT" || element.type !== "file") {
        throw Error("Upload must be applied to input of file type");
    }
    this.container = element.parentNode;
    this.options = helper.extend({}, {
        onchoose: function() {},
        oninvalidfile: function(code) {},
        onsuccess: function(response) {},
        onerror: function(message) {},
        onbeforeupload: function() {},
        onafterupload: function() {},
        onprogress: function(loaded, total) {},
        allowedFormats: [],
        maxSize: null,
        transport: "xhr",
        crossDomain: null,
        uploadUrl: null,
        progressUrl: null,
        name: "file",
        autoUpload: true,
        multiple: false
    }, options);
    if (this.options.autoUpload) {
        this.fileInput.addEventListener("change", function() {
            self.uploadFile.call(self);
        });
    }
    if (!this.options.uploadUrl) {
        throw Error("Upload URL not specified");
    }
    if ("function" === typeof this.options.uploadUrl) {
        this.options.uploadUrl = this.options.uploadUrl();
    }
    element.setAttribute("name", this.options.name);
    if ("function" === typeof options.onchoose) {
        this.fileInput.addEventListener("change", options.onchoose);
    }
    this.setTransport(this.options.transport);
    if (this.options.multiple && this.transport instanceof XhrTransport) {
        element.setAttribute("multiple", "multiple");
    } else {
        element.removeAttribute("multiple");
    }
}

Upload.prototype = {
    setTransport: function(transportName) {
        if (!transportName || [ "xhr", "iframe" ].indexOf(transportName) === -1) {
            transportName = "xhr";
        }
        var Transport;
        if (transportName === "xhr" && "undefined" !== typeof FormData) {
            Transport = XhrTransport;
        } else {
            Transport = IframeTransport;
        }
        this.transport = new Transport(this.fileInput, this.options.uploadUrl, this.options.onbeforeupload, this.options.onprogress, this.options.onsuccess, this.options.onerror, this.options.onafterupload);
        if (this.options.progressUrl && transportName === "iframe") {
            this.transport.setProgressUrl(this.options.progressUrl);
        }
    },
    validate: function() {
        if (!this.options.multiple && this.fileInput.files.length > 1) {
            throw Error("Multiple upload not allowed");
        }
        for (var i = 0; i < this.fileInput.files.length; i++) {
            var file = this.fileInput.files[i];
            if (this.options.maxSize && file.size > this.options.maxSize) {
                throw Error("Size of file not allowed");
            }
            if (this.options.allowedFormats.length) {
                var extension = file.name.substr(file.name.lastIndexOf(".") + 1).toLowerCase();
                if (-1 === this.options.allowedFormats.indexOf(extension) && -1 === this.options.allowedFormats.indexOf(file.type)) {
                    throw "Format not allowed";
                }
            }
        }
    },
    uploadFile: function() {
        try {
            this.validate();
        } catch (code) {
            this.options.oninvalidfile.call(this, code);
            return;
        }
        this.transport.send();
        return this;
    }
};

$.fn.upload = function() {
    var $element = this, element = $element.get(0);
    if (arguments.length && typeof arguments[0] === "object") {
        $element.data("selfInstance", new Upload(element, arguments[0]));
    } else {
        var instance = $element.data("selfInstance");
        if (!instance) {
            throw new Error("Upload not initialised");
        }
        instance[arguments[0]].apply(instance, Array.prototype.slice.call(arguments, 1));
    }
};
return Upload;

}));
