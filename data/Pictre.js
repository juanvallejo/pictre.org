(function(window,document,Pictre){Pictre={
	_404:{
		div:document.createElement("div"),
		exists:false,
		put:function(a) {
			var self = this;
			var a = a || "There seems to be nothing here.";
			this.div.className = "Pictre-empty";
			this.div.innerHTML = a;
			this.exists = true;
			Pictre._settings.wrapper.appendChild(this.div);
			this.position();
			window.addEventListener('resize',function() {
				if(self.exists) {
					self.position();
				}
			});
		},
		remove:function() {
			if(this.exists) {
				this.exists = false;
				Pictre._settings.wrapper.removeChild(this.div);
			}
		},
		position:function() {
			this.div.style.left = (window.innerWidth/2 - (this.div.clientWidth/2))+"px";
			this.div.style.top = ((window.innerHeight-Pictre.get.ui.menu._div.offsetHeight)/2 - (this.div.clientHeight/2))+"px";
		}
	},
	_settings:{
		allowUploads:true,
		app:{
			address:"http://"+window.location.host+"/"
		},
		cloud:{
			datadir:'http://static-pictre.rhcloud.com/',
			address:'http://static-pictre.rhcloud.com/static/'
		},
		data:{
			album:null,
			anchor:0,
			condition:null,
			limit:{
				request:25,
				pageload:50
			},
			kind:0,
			visited:0.6
		},
		minWidth:800,
		pages:{
			restricted:['data','restricted','404','undefined']
		},
		picture:{
			maxWidth:800
		},
		enableLock:true,
		speed:500,
		spotlight:{
			transitionSpeed:750,
			useDocumentElement:false
		},
		uploadLimit:20,
		wrapper:null
	},
	_storage:{
		_loadonready:function() {
			var self = this;
			this.gallery.onready.call(this.gallery);
			Pictre._storage.window.width = window.innerWidth;
			window.addEventListener('resize',function() {
				if(Pictre.client.id == 3) {
					if(Pictre._storage.window.innerWidth) {
						if(Pictre._storage.window.innerWidth != window.innerWidth) Pictre.chisel(),Pictre._storage.window.innerWidth = window.innerWidth;
					} else {
						Pictre._storage.window.innerWidth = window.innerWidth;
					}
				} else if(window.innerWidth != Pictre._storage.window.width) self.chisel(),Pictre._storage.window.width = window.innerWidth;
				if(self.gallery.is.featuring) {
					if(self._storage.overlay.image) {
						self.gallery.overlay.image.position(self._storage.overlay.image);
					}
				}
			});
			window.addEventListener('scroll',function() {
				if($(document).scrollTop()-Pictre._storage.data.lastScrollTop >= 0) Pictre.is.scrollingDown = true;
				else Pictre.is.scrollingDown = false;
				Pictre._storage.data.lastScrollTop = $(document).scrollTop();
				if(!Pictre.is.spotlight && !Pictre.is.busy) {
				//	if($(document).height()-$(document).scrollTop() <= $(document).height()*0.6) {
					if($(document).height()-$(window).height()-$(document).scrollTop() <= 100 + $(document).height()*0.05) {
						if(!Pictre.is.loading && !Pictre.is.done && Pictre.is.scrollingDown) {
							Pictre.is.loading = true;
							Pictre.get.db({from:'all'},function(data) {
								Pictre.load(data,{method:'append'});
								if(!data.length) Pictre.is.done = true;
							});
						}
					}
					if(Pictre._settings.spotlight.useDocumentElement) {
						if(document.body.scrollTop > 0 ) Pictre._settings.spotlight.useDocumentElement = false;
					}
				}
			});
		},
		chisel:{
			count:0,
			queued:true,
			top:0
		},
		comments:{
			author:null
		},
		data:{
			deleted:0,
			lastScrollTop:0,
			loaded:0,
			total:0,
			totalDiv:null
		},
		iterator:0,
		loaded:0,
		overlay:{
			image:null,
			iterator:0,
			locked:false
		},
		pictures:[],
		scrollTop:null,
		upload:{
			method:'replace',
			offset:0,
			overflow:null
		},
		window:{
			innerWidth:null,
			width:null
		}
	},
	board:{
		detect:function() {
			if(window.location.pathname.split("/")[1]) this.is.set = true,document.title = "Pictre - "+this.get();
			else this.is.set = false,document.title = "Pictre";
		},
		exists:false,
		get:function() {
			var r;
			if(this.is.set) {
				var f = window.location.pathname.split("/")[1].toLowerCase();
				var fa = f.split("");
				fa.splice(0,1);
				var c = f.charAt(0).toUpperCase();
			 	r = c+fa.join("");
			 }
			 return r;
		},
		is:{
			set:false
		},
		set:{
			state:function(a) {
				Pictre._settings.data.kind = a;
				Pictre.board.state = a;
				if(Pictre._settings.data.kind < 1) {
					Pictre._settings.allowUploads = false;
					Pictre.get.ui.passcode.put('create');
				} else if(Pictre._settings.data.kind == 1) {
					Pictre.get.ui.menu.removeButton('unlock');
					var title = 'This album is locked. Click to edit or remove images and comments.';
					Pictre.get.ui.menu.addButton({
						id:'lock',
						name:'lock',
						title:title
					}).on('click',function() {
						Pictre.get.ui.passcode.put('unlock');
					});
					if(Pictre.is.spotlight) Pictre.get.ui.menu.hideButton('lock');
				} else if(Pictre._settings.data.kind == 2) {
					Pictre.get.ui.menu.removeButton('lock');
					var title = 'The album is unlocked, you are authorized to make changes. Click to lock.';
					Pictre.get.ui.menu.addButton({
						id:'unlock',
						name:'unlock',
						title:title
					}).on('click',function() {
						Pictre.board.set.state(1);
					});
					if(Pictre.is.spotlight) Pictre.get.ui.menu.hideButton('unlock');
				}
			}
		},
		state:0
	},
	chisel:function(a) {
		var windowWidth = window.innerWidth;
		var itemWidth = this._storage.pictures[0].offsetWidth;
		var itemMargin = 0;
		var columnCount = 0;
		if(windowWidth && itemWidth) {
			itemMargin = parseInt(window.getComputedStyle(this._storage.pictures[0]).getPropertyValue('margin-left').split("px")[0]*2);
			columnCount = Math.floor(windowWidth / (itemWidth+itemMargin));
			if(columnCount > this._storage.pictures.length) {
				columnCount = this._storage.pictures.length;
			}
			this._settings.wrapper.style.width = (columnCount*(itemWidth+itemMargin))+"px";	
			if(a) {
				var x = a+1;
				for(var i=x;i<x+Pictre._settings.data.limit.request;i++) {
					var top = parseInt(this._storage.pictures[i-columnCount].style.top.split("px")[0])+this._storage.pictures[i-columnCount].offsetHeight+itemMargin;
					this._storage.pictures[i].style.left = this._storage.pictures[i-columnCount].style.left;
					this._storage.pictures[i].style.top = top+"px";
				}
			} else {
				for(var i=0;i<this._storage.pictures.length;i++) {
					this._storage.pictures[i].style.clear = "none";
					this._storage.pictures[i].first = false;
				}
				for(var i=0;i<this._storage.pictures.length;i++) {
					this._storage.pictures[i].style.top = "0";
				}
				for(var i=0;i<this._storage.pictures.length;i++) {
					this._storage.pictures[i].style.left = "0";
				}
				for(var i=0;i<this._storage.pictures.length;i+=columnCount) {
					this._storage.pictures[i].first = true;
				}
				for(var i=0;i<this._storage.pictures.length;i++) {
					if(!this._storage.pictures[i].first) {
						this._storage.pictures[i].style.left = (parseInt(this._storage.pictures[i-1].style.left.split("px")[0])+this._storage.pictures[i-1].offsetWidth+itemMargin)+"px";
					}
				}
				for(var i=0;i<this._storage.pictures.length;i++) {
					if(this._storage.pictures[i+columnCount]) {
						this._storage.pictures[i+columnCount].style.top = ((this._storage.pictures[i].offsetTop+this._storage.pictures[i].offsetHeight+itemMargin)-(this._storage.pictures[i+columnCount].offsetTop))+"px";
						if(!a) this._storage.chisel.top = this._storage.pictures[i+columnCount].style.top;
					}
				}
			}
			Pictre._settings.wrapper.parentNode.style.height = (Pictre._settings.wrapper.scrollHeight+itemMargin)+"px";
		}
	},
	client:{
		compatible:true,
		detect:function() {
			if(navigator.userAgent.indexOf("AppleWebKit") != -1) {
				if(navigator.userAgent.indexOf("Chrome") != -1) {
					this.name = "Chrome";
					this.id = 1;
				} else {
					if(navigator.userAgent.indexOf("Mobile") != -1) {
						this.name = "Mobile Safari";
						this.id = 3;
					} else {
						this.name = "Safari";
						this.id = 2;
						ver = navigator.userAgent.split("Version/");
						this.version = ver[1].split(" ")[0];
					}
				}
			} else {
				if(navigator.userAgent.indexOf("Firefox") != -1) {
					this.name = "Firefox";
					this.id = 4;
				} else if(navigator.userAgent.indexOf("Opera") != -1) {
					this.name = "Opera";
					this.id = 5;
				} else if(navigator.userAgent.indexOf("MSIE ") != -1) {
					if(navigator.userAgent.indexOf("Trident") != -1) {
						var nav = navigator.userAgent.split(";")[1];
						nav = parseInt(nav.split(" ")[2]);
						this.name = "Internet Explorer";
						this.version = nav;
						if(nav > 8) this.id = 6;
						else this.id = 7
					} else {
						this.name = "Internet Explorer";
						this.id = 8;
					}
				}
			}
			if(this.id >= 7) {
				var warning;
				var lock = false;
				if(this.id == 7 || this.id == 8) {
					warning = "Unfortunately Pictre is not supported in your browser, please consider upgrading to Google Chrome, by clicking here, for an optimal browsing experience.";
					lock = true;
				}
				Pictre.get.ui.warning.onclick = function() {
					window.open("http://chrome.google.com","_blank");
				};
				Pictre.get.ui.warning.put({
					header:'Sorry about that!',
					body:warning,
					locked:lock
				});
			}
		},
		id:null,
		name:'Unknown',
		os:navigator.platform,
		online:navigator.onLine,
		version:null
	},
	create:{
		picture:function(a,b) {
			var self = Pictre;
			if(b) Pictre._storage.upload.method = b;
			var img = new Image();
			var pic = document.createElement("div");
				pic.id = "pic"+a.id;
				if(!self.is.loaded && !b && Pictre._settings.wrapper.style.display != "none") Pictre._settings.wrapper.style.display = "none";
				img.src = Pictre._settings.cloud.datadir+a.thumb;
				img._onload = function(a) {
					if(b == "prepend" || b == "append") {
						if(b == "prepend") Pictre.chisel();
						else {
							Pictre._storage.data.loaded++;
							Pictre.chisel(Pictre._settings.data.anchor-Pictre._settings.data.limit.request-Pictre._storage.data.deleted-1);
							if(Pictre._storage.data.loaded == Pictre._settings.data.limit.request) {
								Pictre._storage.data.loaded = 0;
								Pictre.is.loading = false;
							}
						}
					} else {
						self._storage.loaded++;
						if(self._storage.loaded == self._storage.pictures.length) {
							Pictre.get.ui.loader.put(1);
							Pictre._settings.wrapper.style.display = "block";
							self._storage.loaded = 0;
							self.chisel();
							if(!self.is.loaded) {
								self.is.loaded = true;
								self._storage._loadonready.call(self);
							}
						} else {
							Pictre.get.ui.loader.put(self._storage.loaded/self._storage.pictures.length); 
						}
					}
				};
				img.addEventListener('load',function() {
					pic.innerHTML = "";
					pic.appendChild(img);
					this._onload();
				});
				img.addEventListener('error',function() {
					var height = 137;
                    var paddingTop = parseInt(window.getComputedStyle(pic).getPropertyValue('padding-top').split("px")[0])+1;
                    var paddingBottom = parseInt(window.getComputedStyle(pic).getPropertyValue('padding-bottom').split("px")[0]);
                    var errImg = new Image();
                        errImg.src = "data/i/Pictre-404.png";
					pic.innerHTML = "";
					pic.data.src = "data/i/Pictre-404.png";
                    pic.style.height = (height-paddingTop+paddingBottom*2)+"px";
                    pic.appendChild(errImg);
					this._onload();
				});
				pic.addEventListener('click',function() {
					if(window.location.hash.split("#")[1] == this.data.dbid) {
						if(Pictre.client.id == 3 || window.innerWidth < Pictre._settings.minWidth) Pictre.spotlight.feature(this);
						else Pictre.gallery.feature(this);
					} else window.location.assign("#"+a.id);
				});
				pic.className = self.properties.className;
				pic.innerHTML = "loading...";
				pic.data = {
					author:a.author,
					comments:a.comments,
					date:a.time,
					dbid:a.id,
					id:null,
					prepend:false,
					src:Pictre._settings.cloud.datadir+a.src,
					thumb:Pictre._settings.cloud.datadir+a.thumb
				};
				if(b == "prepend") pic.data.prepend = true;
				else {
					pic.data.id = self._storage.iterator;
					self._storage.iterator++;
				}
			if(b == "prepend") self._storage.pictures.unshift(pic);
			else self._storage.pictures.push(pic);
			if(self._settings.wrapper) {
				if(b == "prepend") self._settings.wrapper.insertBefore(pic,self._settings.wrapper.children[0]);
				else self._settings.wrapper.appendChild(pic);
			}
			return pic;
		}
	},
	get:{
		_data:null,
		all:function() {
			return Pictre._storage.pictures;
		},
		db:function(a,b) {
			var self = this;
			var settings = {
				album:false,
				from:"all",
				anchor:Pictre._settings.data.anchor,
				limit:Pictre._settings.data.limit.request,
				where:Pictre._settings.data.condition
			};
			if(a) {
				if(typeof a == "object") {
					for(var i in a) {
						settings[i] = a[i];
					}
				} else settings.from = a;
			}
			var album = settings.album === true && Pictre._settings.enableLock === true ? "&album="+Pictre.board.get().toLowerCase() : "";
			var where = settings.where ? "&where="+encodeURIComponent(settings.where) : "";
			if(Pictre.client.id > 5 || !Pictre.client.compatible) {
				if(window.XDomainRequest) {
					var xdr = new XDomainRequest();
					xdr.open("post",Pictre._settings.cloud.address+'data.php');
					xdr.send("type=get_data&request="+settings.from+where+"&anchor="+settings.anchor+album+"&limit="+settings.limit+"&ie=true");
					xdr.onload = function() {
						if(xdr.responseText == "NO_DATA") {
							Pictre.get.ui.notice("No image data was returned by the server.");
						} else {
							self._data = JSON.parse(xdr.responseText);
							if(typeof b == "function") b.call(Pictre,self._data);
						}
					};
					xdr.onerror = function(error) {
						Pictre.get.ui.notice("There was an error processing the images.");
						console.log(error);
					};
				} else {
					$.support.cors = true;
					$.ajax({
						type:'POST',
						url:Pictre._settings.cloud.address+'data.php',
						async:true,
						crossDomain:true,
						data:{
							type:'get_data',
							request:settings.from,
							anchor:settings.anchor,
							limit:settings.limit,
							album:album,
							where:where
						},
						success:function(data) {
							self._data = JSON.parse(data);
							if(typeof b == "function") b.call(Pictre,self._data);
						},
						error:function(error) {
							for(var i in error) {
								console.log(i+":"+error[i]);
							}
							Pictre.get.ui.notice("Error processing data.");
							console.log(error);
						}
					});
				}
			} else { 
				var xhr = new XMLHttpRequest();
				try {
					xhr.open("POST",Pictre._settings.cloud.address+'data.php',true);
				} catch(e) {
					Pictre.get.ui.notice("Reverting to compatibility mode for older browsers.");
					Pictre.client.compatible = false;
					self.db(a,settings);
					console.log(e);
				}

				xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
				xhr.send("type=get_data&request="+settings.from+where+"&anchor="+settings.anchor+album+"&limit="+settings.limit);
				xhr.addEventListener('readystatechange',function() {
					if(xhr.readyState == 4 && xhr.status == 200) {
						try {
							self._data = JSON.parse(xhr.responseText);
							if(typeof b == "function") b.call(Pictre,self._data);
						} catch(e) {
							console.log(e);
							var message = 'Pictre is down due to server maintenance and will resume shortly.';
							Pictre.get.ui.notice('Pictre is unable to load album data at this moment.');
							Pictre.get.ui.warning.put({
								body:message,
								header:'Updates in progress!',
								icon:null,
								locked:true
							});
						}
					}
				});
			}
		},
		hash:function() {
			if(window.location.hash) {
				var id = window.location.hash.split("#")[1];
				var pic = document.getElementById("pic"+id);
				if(Pictre.gallery.is.featuring) {
					if(pic) Pictre.gallery.overlay.replaceImage({object:pic});
					else Pictre.gallery.overlay.exit();
				} else {
					if(window.innerWidth < Pictre._settings.minWidth || Pictre.client.id == 3) {
						if(pic) {
							Pictre.spotlight.feature(pic);
						}
					} else {
						if(pic) Pictre.gallery.feature(pic);
					}
				}
			} else {
				if(Pictre.is.spotlight) Pictre.spotlight.remove(),Pictre.get.ui.menu.removeButton('back');
				else if(Pictre.gallery.is.featuring) Pictre.gallery.overlay.exit();
			}
		},
		picture:function(a) {
			return Pictre._storage.pictures[a];
		},
		total:function() {
			return Pictre._storage.pictures.length;
		},
		ui:{
			home:{
				wrapper:null,
				position:function() {
					if(window.innerWidth < 500) {
						this.wrapper.style.width = (window.innerWidth-2)+"px";
						this.wrapper.style.left = 0;
					} else {
						this.wrapper.style.width = "65%";
						this.wrapper.style.left = (window.innerWidth / 2 - this.wrapper.clientWidth / 2)+"px";
					}
					this.wrapper.style.top = "80px";
				},
				put:function(a) {
					if(this.wrapper) this.remove();
					var self = this;
					var container = document.createElement("div");
						container.className = "Pictre-home-container";
					var input = document.createElement("input");
						input.type = "text";
						input.placeholder = "Enter an album's name";
						input.autofocus = true;
						input.id = "Pictre-album-input";
						input.addEventListener("keydown",function(e) {
							if(e.keyCode == 13) {
								var val = this.value.toLowerCase().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
								if(Pictre._settings.pages.restricted.indexOf(this.value.toLowerCase()) == -1) {
									if(this.value.match(/[^a-z0-9\-\.\+\_\ ]/gi)) {
										Pictre.get.ui.notice("Your album name contains invalid characters.");
									} else {
										if(this.value.match(/[\ ]/g)) Pictre.get.ui.notice("Your album name cannot contain spaces.");
										else window.location.assign(Pictre._settings.app.address+val);
									}
								} else {
									this.value = "";
									Pictre.get.ui.notice("That album is restricted, please try another.");
								}
							}
						});
					var p = document.createElement("p");
					if(Pictre.client.id == 5) input.removeAttribute('autofocus');
					if(Pictre.client.name == "Internet Explorer" || Pictre.client.id == 3 || (Pictre.client.id == 2 && Pictre.client.version.indexOf("5.1.") != -1)) {
						input.placeholder = "";
						var val = "Enter an album's name";
						input.value = val;
						input.removeAttribute('autofocus');
						input.addEventListener('focus',function() {
							if(this.value == val) this.value = '';
						});
						input.addEventListener('blur',function() {
							if(this.value == '') this.value = val;
						});
					}
					this.wrapper = document.createElement("span");
					this.wrapper.className = "Pictre-home-wrapper";
						p.appendChild(input);
						container.appendChild(p);
						this.wrapper.appendChild(container);
						if(a) a.appendChild(this.wrapper);
						window.addEventListener('resize',function() {
							self.position();
						});
					this.wrapper.appendTo = function(b) {
						b.appendChild(this);
						self.position();
						return this;
					};
						return this.wrapper;
				},
				remove:function() {
					if(this.wrapper) document.body.removeChild(this.wrapper);
				}
			},
			imageOptions:{
				div:null,
				hide:function() {
					if(this.div) {
						this.is.hidden = true;
						this.div.style.display = "none";
					}
				},
				is:{
					active:false,
					disabled:false,
					hidden:false
				},
				options:{
					Delete:function() {
						Pictre.terminal.parse({
							id:Pictre.gallery.overlay.img.data.dbid,
							src:Pictre.gallery.overlay.img.data.src,
							thumb:Pictre.gallery.overlay.img.data.thumb,
							command:"/Pictre delete"
						},function(log) {
							if(log.error) {
								//what to do after deletion...
							}
						});
					}
				},
				put:function(a) {
					if(!this.is.disabled) {
						var self = this;
						if(this.div) {
							this.is.hidden = false;
							this.div.style.display = "block";
						} else {
							this.is.active = false;
							this.div = document.createElement("div");
							this.div.className = "Pictre-overlay-pic-options";
							this.div.optionsWrapper = document.createElement("div");
							this.div.optionsWrapper.className = "Pictre-overlay-pic-options-wrapper";
							this.div.optionsWrapper.innerWrapper = document.createElement("ul");
							for(var i in this.options) {
								var li = document.createElement("li");
									li.key = i;
									li.innerHTML = i;
								this.div.optionsWrapper.innerWrapper.appendChild(li);
								if(this.options[i]) {
									li.addEventListener('click',function() {
										self.options[this.key].call(self);
									});
								}
							}
							this.div.optionsWrapper.addEventListener('click',function(e) {
								e.stopPropagation();
							});
							this.div.addEventListener('click',function(e) {
								e.stopPropagation();
								if(self.is.active) {
									self.is.active = false;
									this.optionsWrapper.style.display = "none";
								} else {
									self.is.active = true;
									this.optionsWrapper.style.display = "block";
									self.position(a);
								}
							});
							this.div.optionsWrapper.appendChild(this.div.optionsWrapper.innerWrapper);
							a.appendChild(this.div);
							a.appendChild(this.div.optionsWrapper);
							this.div.optionsWrapper.style.top = this.div.clientHeight+"px";
							this.position(a);
							window.addEventListener('resize',function() {
								self.position(a);
							});
						}
					}
				},
				position:function(a) {
					var optionsWrapperWidth = ((-this.div.optionsWrapper.clientWidth/2)+this.div.clientWidth/2);
						if(-optionsWrapperWidth > (window.innerWidth - a.clientWidth) / 2) {
							optionsWrapperWidth += (-optionsWrapperWidth - (window.innerWidth - a.clientWidth)/2);
							if(optionsWrapperWidth > 0) optionsWrapperWidth = 0;
						}
						this.div.optionsWrapper.style.right = optionsWrapperWidth+"px";
				}
			},
			loader:{
				div:null,
				put:function(a) {
					var self=this;
					var p=a*100;
					if(!self.div) {
						self.div = document.createElement("div");
						self.div.progress = document.createElement("div");
						self.div.progress.className = "Pictre-loader-progress";
						self.div.className = "Pictre-loader-wrapper";
						self.div.appendChild(self.div.progress);
						document.body.appendChild(self.div);
						self.position();
						window.addEventListener('resize',function() {
							self.position();
						});
					}
					self.div.progress.style.width = p+"%";
					if(a == 1) self.remove();
				},
				position:function() {
					var self = this;
					var offset = Pictre.get.ui.menu._div.clientHeight+Pictre._storage.data.totalDiv.parentNode.clientHeight;
					self.div.style.top = ((window.innerHeight+offset) / 2 + self.div.clientHeight / 2)+"px";
					self.div.style.left = (window.innerWidth / 2 - self.div.clientWidth / 2)+"px";
				},
				remove:function() {
					if(this.div) document.body.removeChild(this.div);
				}
			},
			menu:{
				_div:null,
				addButton:function(a) {
					this.buttons[a.name] = document.createElement("div");
					this.buttons[a.name].id = a.id;
					this.buttons[a.name].className = "top-button";
					this.buttons[a.name].title = a.title;
					this._div.appendChild(this.buttons[a.name]);
					this.buttons[a.name].style.top = (this.buttons[a.name].parentNode.clientHeight / 2 - this.buttons[a.name].clientHeight / 2)+"px";
					this.buttons[a.name].on = function(a,b) {
						this.addEventListener(a,function(e) {
							b.call(this,e);
						});
						return this;
					};
					return this.buttons[a.name];
				},
				buttons:{},
				getButton:function(a) {
					return this.buttons[a];
				},
				hasButton:function(a) {
					var r = false;
					if(this.buttons.hasOwnProperty(a)) r = true;
					return r;
				},
				hideButton:function(a) {
					this.buttons[a].style.display = "none";
				},
				put:function(a,b) {
					this._div = document.createElement("div");
					this._div.id = "top";
					var brand = document.createElement("div");
						brand.id = "brand";
						brand.innerHTML = "Pictre";
						brand.addEventListener('click',function() {
							window.location.href = Pictre._settings.app.address;
						});
					this._div.appendChild(brand);
					if(b) a.insertBefore(this._div,b);
					else a.appendChild(this._div);
					brand.style.top = (this._div.clientHeight / 2 - brand.clientHeight / 2)+"px";
					return this._div;
				},
				removeButton:function(a) {
					if(this.buttons.hasOwnProperty(a)) this._div.removeChild(this.buttons[a]),delete this.buttons[a];
				},
				showButton:function(a) {
					this.buttons[a].style.display = "block";
				}
			},
			passcode:{
				div:null,
				input:function(a) {
					var self = this;
					this.div = document.createElement("input");
					this.type = "text";
					this.password = false;
					this.className = "Pictre-passcode-input";
					this.placeholder = "Create a passcode";
					this.value = a;
					this.create = function() {
						if(!this.value) this.value = this.placeholder;
						this.div.maxLength = 10;
						this.div.className = this.className;
						this.div.type = this.type;
						this.div.placeholder = this.placeholder || "";
						this.div.value = this.value || "";
						this.div.addEventListener('focus',function(e) {
							if(self.password) self.div.type = "password";
							if(self.div.value == self.value) self.div.value = "";
						});
						this.div.addEventListener('blur',function() {
							if(self.password) self.div.type = "text";
							if(self.div.value == "") self.div.value = self.value;
						});
						this.div.on = function(b,c) {
							this.addEventListener(b,function(e) {
								c.call(self,e);
							});
							return this;
						};
						return this.div;
					}
				},
				put:function(a) {
					var self = this;
					self.div = null;
					if(Pictre.gallery.is.featuring) {
						while(Pictre.gallery.overlay.div.hasChildNodes()) {
							Pictre.gallery.overlay.div.removeChild(Pictre.gallery.overlay.div.lastChild);
						}
					}
					if(!self.div) {
						var p = document.createElement("div");
							p.className = "Pictre-passcode-p";
							if(a == 'create') p.innerHTML = "Congratulations! You have found a new album, create a passcode below to claim it as your own!";
							else p.innerHTML = "To proceed, enter the passcode for this album.";
						if(a == 'create') {
							Pictre._storage.overlay.locked = true;
							var inp1 = new self.input("Create a passcode");
							var inp2 = new self.input("Verify passcode");
								inp2.placeholder = "Confirm your passcode";
							inp1.create().on('keydown',function(e) {
								if(e.keyCode == 13) {
									if(inp2.div.value != "" && inp2.div.value != inp2.value) self.submit([inp2.div,inp1.div],"passcode_set",_onsubmit);
									else inp2.div.focus();
								}
							});
							inp2.create().on('keydown',function(e) {
								if(e.keyCode == 13) {
									if(inp1.div.value != "" && inp1.div.value != inp1.value) self.submit([inp2.div,inp1.div],"passcode_set",_onsubmit);
									else inp1.div.focus();
								}
							});
						} else {
							Pictre._storage.overlay.locked = false; ////--
							var inp1 = new self.input();
								inp1.placeholder = "Enter your passcode";
								inp1.password = true;
								inp1.create().on('keydown',function(e) {
									if(e.keyCode == 13) {
										if(this.div.value != "" && this.value != this.div.value) self.submit([this.div],"board_unlock",function(data) {
											if(data == "success") {
												Pictre.board.set.state(2);
												Pictre._storage.overlay.locked = false;
												Pictre._settings.allowUploads = true;
												self.remove();
												Pictre.gallery.overlay.div.click();
											} else {
												self.div.contentWrapper.innerHTML = "<p>Wrong passcode, please try again.</p>";
												setTimeout(function() {
													self.remove();
													self.put();
												},2000);
											}
										});
									}
								}).on('click',function(e) {
									e.stopPropagation();
								});
						}
						self.div = document.createElement("div");
						self.div.className = "Pictre-passcode-wrapper";
						self.div.contentWrapper = document.createElement("div");
						self.div.contentWrapper.className = "Pictre-passcode-input-wrapper";
						self.div.contentWrapper.appendChild(p);
						self.div.contentWrapper.appendChild(inp1.div);
						if(a == 'create') self.div.contentWrapper.appendChild(inp2.div);
						self.div.appendChild(self.div.contentWrapper);
						if(Pictre.gallery.is.featuring) Pictre.gallery.overlay.div.appendChild(self.div);
						else Pictre.gallery.overlay.put().appendChild(self.div);
						window.addEventListener('resize',function() {
							self.position();
						});
						function _onsubmit(a) {
							if(a == "success") {
								Pictre.board.set.state(1);
								Pictre._storage.overlay.locked = false;
								Pictre._settings.allowUploads = true;
								self.remove();
								Pictre.gallery.overlay.div.click();
							} else {
								console.log(a);
								self.div.contentWrapper.innerHTML = "<p>There was an error saving your passcode, please try again later!</p>";
								setTimeout(function() {
									self.remove();
									self.put();
								},2000);
							}
						};
					}
					self.position();
				},
				position:function() {
					var self = this;
					if(self.div) {
						self.div.style.left = (window.innerWidth / 2 - self.div.clientWidth / 2)+"px";
						self.div.style.top = (window.innerHeight / 2 - self.div.offsetHeight / 2)+"px";
						self.div.contentWrapper.style.left = (self.div.clientWidth / 2 - self.div.contentWrapper.clientWidth / 2)+"px";
						self.div.contentWrapper.style.top = (self.div.clientHeight / 2 - self.div.contentWrapper.offsetHeight / 2)+"px";
					}
				},
				remove:function() {
					Pictre.gallery.overlay.div.removeChild(this.div);
					this.div = null;
				},
				submit:function(a,b,c) {
					if((b == "passcode_set" && a[0].value == a[1].value) || (b == "board_unlock" && a[0].value)) {
						this.div.contentWrapper.innerHTML = "<p>loading, please wait...</p>";
						var xhr = new XMLHttpRequest();
						xhr.open('POST',Pictre._settings.cloud.address+"data.php",true);
						xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
						xhr.send("type="+b+"&passcode="+a[0].value+"&album="+Pictre.board.get().toLowerCase());
						xhr.addEventListener('readystatechange',function() {
							if(xhr.readyState == 4 && xhr.status == 200) {
								if(typeof c == "function") c.call(this,xhr.responseText);
							}
						});
					} else this.div.contentWrapper.children[0].innerHTML = "Your passcodes do not match, please try again.";
					this.position();
				}
			},
			notice:function(a,b) {
				var oldNote = document.getElementsByClassName("Pictre-notice");
				if(oldNote.length) document.body.removeChild(oldNote[0]);
				var a = a || "Untitled notice";
				var note = document.createElement("div");
					note.className = "Pictre-notice";
					note.innerHTML = a;
				 	Pictre._storage.data.totalDiv = document.createElement("div");
					Pictre._storage.data.totalDiv.className = "Pictre-notice-extra";
					if(Pictre.board.exists) {
						Pictre._storage.data.totalDiv.innerHTML = b || 0;
						Pictre._storage.data.totalDiv.title = "There are "+Pictre._storage.data.totalDiv.innerHTML+" pictures in this album";
					}
				note.appendChild(Pictre._storage.data.totalDiv);
				document.body.appendChild(note);
				if(Pictre._settings.wrapper) Pictre._settings.wrapper.style.marginTop = "52px";
			},
			upload:{
				div:null,
				response:null,
				put:function() {
					var self = this;
					this.div = document.createElement("div");
					this.div.className = "Pictre-upload";
					Pictre.gallery.overlay.put().appendChild(this.div).addEventListener('click',function(e) {
						if(window.innerWidth > Pictre._settings.minWidth) e.stopPropagation();
					});
					this.position();
					window.addEventListener('resize',function() {
						self.position();
					});
					var header = document.createElement("div");
						header.className = "Pictre-upload-header";
						header.innerHTML = "Upload";
						header.style.zIndex = "999";
					var input = document.createElement("input");
						input.type = "file";
						input.name = "images[]";
						input.multiple = true;
						input.style.position = "absolute";
						input.style.top = "0";
						input.style.zIndex = "-1";
						input.style.opacity = "0";
					var p = document.createElement("p");
					var p_text = document.hasOwnProperty("ondragover") ? "Drag and drop your files here. Or simply, click to select files from your device." : "Click to select files from your device.";
						p.innerHTML = p_text;
					var shader = document.createElement("div");
						shader.className = "Pictre-upload-area-shader";
						shader.appendChild(p);
					var progress = document.createElement("div");
						progress.className = "Pictre-upload-area-progress";
					var area = document.createElement("div");
						area.className = "Pictre-upload-area";
						area.appendChild(shader);
						area.appendChild(progress);
						this.div.appendChild(header);
						this.div.appendChild(area);
						this.div.appendChild(input);
						area.style.marginLeft = (-area.clientWidth / 2)+"px";
						area.style.marginTop = (-area.clientHeight / 2 + 20)+"px";
						area.addEventListener('dragover',function(e) {
							e.preventDefault();
							if(!area.locked) area.style.background = "rgb(52,56,55)";
						});
						input.addEventListener('click',function(e) {
							e.stopPropagation();
						});
						area.addEventListener('click',function(e) {
							e.stopPropagation();
							if(!area.locked) {
								input.click();
							}
						});
						area.addEventListener('drop',function(e) {
							e.preventDefault();
							render(e.dataTransfer.files,upload);
						});
						if(Pictre.client.id == 5) {
							area.ondrop = function() {};
						}
						input.addEventListener('change',function() {
							if(input.files.length) render(input.files,upload);
						});
						function render(f,b) {
							if(!area.locked) {
								area.locked = true;
								var i = 0;
								var exif = [];
								progress.style.width = "0";
								progress.style.background = "rgb(151,125,4)";									
								read();
								function read() {
									var kind = f[i].type.split("/");
									if(kind[0] == "image") {
										var reader = new FileReader;
										reader.readAsBinaryString(f[i]);
										reader.onloadend = function() {
											exif[i] = new EXIF.readFromBinaryFile(new BinaryFile(this.result));
											next();
										};
									} else {
										next();
									}
								};
								function next() {
									i++;
									progress.style.width = (i/f.length*100)+"%";
									p.innerHTML = "Analyzing image data "+parseInt(i/f.length*100)+"%";
									if(i == f.length) {
										area.locked = false;
										for(var x=0;x<f.length;x++) {
											f[x].exif = exif[x];
										}
										if(typeof b == "function") b.call(Pictre,f)
									} else {
										read();
									}
								}
							}
						};
						function upload(f) {
							if(!area.locked) {
								Pictre._storage.overlay.locked = true;
								var files = [];
								if(!Pictre._storage.upload.overflow) {
									if(f.length > Pictre._settings.uploadLimit) {
										Pictre._storage.upload.overflow = [];
										for(var i=0;i<Pictre._settings.uploadLimit;i++) {
											files.push(f[i]);
										}
										for(var i=Pictre._settings.uploadLimit;i<f.length;i++) {
											Pictre._storage.upload.overflow.push(f[i]);
										}
									} else {
										files = f;
									}
								} else {
									var lim = Pictre._storage.upload.overflow.length - Pictre._storage.upload.offset > Pictre._settings.uploadLimit ? Pictre._settings.uploadLimit+Pictre._storage.upload.offset : Pictre._storage.upload.overflow.length;
									for(var i=Pictre._storage.upload.offset;i<lim;i++) {
										files.push(Pictre._storage.upload.overflow[i]);
									}
									var num = Pictre._storage.upload.overflow.length - Pictre._storage.upload.offset > Pictre._settings.uploadLimit ? Pictre._settings.uploadLimit : Pictre._storage.upload.overflow.length - Pictre._storage.upload.offset;
									Pictre._storage.upload.offset+=num;
								}
								area.locked = true;
								area.style.background = "rgb(40,43,42)";
								progress.style.background = "rgb(64,2,74)";
								progress.style.width = "0";
								if(files.length == 1) {
									p.innerHTML = "Uploading "+files[0].name+"...";
								} else {
									if(Pictre._storage.upload.overflow) {
										var offset = Pictre._storage.upload.offset >= Pictre._storage.upload.overflow.length + Pictre._settings.uploadLimit ? Pictre._storage.upload.offset : Pictre._storage.upload.offset+Pictre._settings.uploadLimit;
										p.innerHTML = "Uploading "+(offset)+" of "+(Pictre._storage.upload.overflow.length+Pictre._settings.uploadLimit)+" images...";
									} else {
										p.innerHTML = "Uploading "+files.length+" images...";
									}
								}
								var post = self.post(files,function(e) {
									if(e.response == "success") {	
										Pictre._storage.overlay.locked = false;
										if(e.ignored.length > 0) {
											if(!e.pending.length) {
												if(Pictre._storage.upload.overflow) {
													if(Pictre._storage.upload.offset >= Pictre._storage.upload.overflow.length) {
														Pictre._storage.upload.overflow = null;
														Pictre._storage.upload.offset = 0;
														p.innerHTML = "Your last "+Pictre._settings.uploadLimit+" images could not be uploaded because none of them are supported...";
													} else {
														area.locked = false;
														Pictre._storage.overlay.locked = true;
														p.innerHTML = "Images "+(Pictre._storage.upload.offset-Pictre._settings.uploadLimit)+" through "+Pictre._storage.upload.offset+" could not be uploaded because none of them were supported files... Preparing next batch of images for upload...";
														upload();
													}
												} else {
													p.innerHTML = "None of the files were uploaded because none of them were supported images...";
												}
											} else {
												progress.style.background = "rgb(86,35,9)";
												if(Pictre._storage.upload.overflow) {
													if(Pictre._storage.upload.offset >= Pictre._storage.upload.overflow.length) {
														Pictre._storage.upload.overflow = null;
														Pictre._storage.upload.offset = 0;
														p.innerHTML = "Hey! only "+e.pending.length+" of your last "+Pictre._settings.uploadLimit+" images were uploaded because "+e.ignored.length+" of them are not supported...";
													} else {
														area.locked = false;
														Pictre._storage.overlay.locked = true;
														p.innerHTML = "Hey! only "+e.pending.length+" of your images were uploaded because "+e.ignored.length+" of them are not supported... Preparing next batch of images for upload";
														upload();
													}
												} else {
													p.innerHTML = "Hey! "+e.ignored.length+" of your images could not be uploaded because they are not supported! Don't worry though, the rest were uploaded just fine.";
												}
											}
										} else {
											progress.style.background = "rgb(23,68,20)";
											if(Pictre._storage.upload.overflow) {
												if(Pictre._storage.upload.offset >= Pictre._storage.upload.overflow.length) {
													Pictre._storage.upload.overflow = null;
													Pictre._storage.upload.offset = 0;
													p.innerHTML = "Yay! All of your images have been uploaded!";
												} else {
													area.locked = false;
													Pictre._storage.overlay.locked = true;
													p.innerHTML = "Preparing next set of images for upload...";
													upload();
												}
											} else {
												p.innerHTML = "Yay! All of your images have been uploaded!";
											}
										}
										if(e.pending.length) {
											Pictre.get.db({limit:e.pending.length,anchor:0},function(data) {
												Pictre.load(data,{method:'prepend'});
											});
										}
									} else if(e.response == "timeout") {
										progress.style.background = "rgb(86,35,9)";
										p.innerHTML = "Attempting to retrieve uploaded images, please wait...";
										Pictre.get.db({from:'all',where:Pictre._settings.data.condition,anchor:0,limit:Pictre._settings.data.limit.pageload},function(data) {
											p.innerHTML = "Hey! Pictre has encountered a problem and could not finish uploading some of your files, sorry about that!";
											Pictre.load(data);
										});
									} else {
										p.innerHTML = e.response;
									}
									area.locked = false;
								});
								if(post) {
									post.upload.addEventListener('progress',function(e) {
										area.locked = true;
										if(e.lengthComputable) {
											var percent = parseInt(e.loaded / e.total * 100);
											progress.style.width = percent+"%";
										}
									});
									post.upload.addEventListener('load',function() {
										area.locked = true;
										p.innerHTML = "Moving images into place...";
									});
									post.upload.addEventListener('error',function() {
										area.locked = false;
										Pictre._storage.overlay.locked = false;
										Pictre._storage.upload.overflow = null;
										Pictre._storage.upload.offset = 0;
										p.innerHTML = "There was an error uploading your images! Don't worry though, it's not your fault.";
									});
								} else {
									area.locked = false;
									Pictre._storage.overlay.locked = false;
									Pictre._storage.upload.overflow = null;
									Pictre._storage.upload.offset = 0;
									p.innerHTML = "No files were uploaded because none of the files you are trying to upload are images...";
								}
							}
						};
				},
				position:function() {
					if(this.div) {
						this.div.style.left = (window.innerWidth/2 - (this.div.clientWidth/2))+"px";
						this.div.style.top = (window.innerHeight/2 - (this.div.clientHeight/2))+"px";
					}
				},
				post:function(a,b) {
					var Files = {
						allowed:['jpeg','png','gif'],
						ignored:[],
						pending:[],
						response:null,
						total:a
					};
					for(var i=0;i<a.length;i++) {
						var kind = a[i].type.split("/");
						if(kind[0] == "image" && Files.allowed.indexOf(kind[1]) != -1) {
							Files.pending.push(a[i]);
						} else {
							Files.ignored.push(a[i]);
						}
					}
					if(Files.pending.length) {
						var data = new FormData();
						for(var i=0;i<Files.pending.length;i++) {
							data.append(i,Files.pending[i]);
							if(Files.pending[i].exif) data.append("exif"+i,JSON.stringify(Files.pending[i].exif));
							data.append("album"+i,encodeURIComponent(Pictre._settings.data.album));
						}
						data.append("board",Pictre.board.get());
						this.response = Files;
						var xhr = new XMLHttpRequest();
							xhr.open("POST",Pictre._settings.cloud.address+'data.php',true);
							xhr.upload.addEventListener("progress",function(){});
							xhr.send(data);
							xhr.addEventListener('readystatechange',function() {
								var call = false;
								if(xhr.status == 200 && xhr.readyState == 4) {
									Files.response = xhr.responseText;
									call = true;
								} else if(xhr.status == 504) {
									Files.response = "timeout";
									call = true;
								}
								if(typeof b == "function" && call) b.call(this,Files);
							});
						return xhr;
					} else {
						return false;
					}
				},
				remove:function() {
					Pictre.gallery.overlay.div.removeChild(this.div);
					this.div = null;
				}
			},
			warning:{
				div:null,
				response:null,
				put:function(a) {
					var self = this;
					var settings = {
						body:'An error has occurred, don\'t worry though, it\'s not your fault!',
						dropzone:false,
						header:'Hey!',
						icon:null,
						locked:false,
						style:true
					};
					if(a) {
						for(var i in a) {
							settings[i] = a[i];
						}
					}
					this.div = document.createElement("div");
					this.div.className = "Pictre-upload Pictre-warning";
					Pictre.gallery.overlay.put().appendChild(this.div).addEventListener('click',function(e) {
						e.stopPropagation();
					});
					this.position();
					window.addEventListener('resize',function() {
						self.position();
					});
					var header = document.createElement("div");
						header.className = "Pictre-upload-header";
						header.innerHTML = settings.header;
						header.style.zIndex = "999";
					var p = document.createElement("p");
						p.className = "Pictre-warning-p";
						p.innerHTML = settings.body || "Untitled text";
					this.div.appendChild(header);
					if(settings.dropzone) {
						var shader = document.createElement("div");
							shader.className = "Pictre-upload-area-shader";
							shader.appendChild(p);
						var area = document.createElement("div");
							area.className = "Pictre-upload-area";
							area.appendChild(shader);
							this.div.appendChild(area);
							area.style.marginLeft = (-area.clientWidth / 2)+"px";
							area.style.marginTop = (-area.clientHeight / 2 + 20)+"px";
					} else {
						this.div.appendChild(p);
						p.style.marginTop = ((this.div.clientHeight-header.clientHeight) / 2 - (p.clientHeight/2))+"px";
					}
					if(settings.icon) {
						var icon = document.createElement("img");
							icon.src = settings.icon;
							icon.style.display = "block";
							icon.style.margin = "20px auto 0 auto";
							p.appendChild(icon);
					}
					if(settings.locked) {
						Pictre._storage.overlay.locked = true;
					}
					if(typeof this.onclick == 'function') {
						if(settings.dropzone) {
							area.addEventListener('click',function() {
								self.onclick();
							});
						} else {
							this.div.addEventListener('click',function() {
								self.onclick();
							});
						}
					}
				},
				onclick:null,
				position:function() {
					if(this.div) {
						this.div.style.left = (window.innerWidth/2 - (this.div.clientWidth/2))+"px";
						this.div.style.top = (window.innerHeight/2 - (this.div.clientHeight/2))+"px";
					}
				},
				remove:function() {
					document.body.removeChild(this.div);
					this.div = null;
				}
			}
		}
	},
	gallery:{
		feature:function(a) {
			Pictre.gallery.is.featuring = true;
			var self = Pictre;
			var pic = document.createElement("div");
				pic.className = "Pictre-overlay-pic";
				pic.data = a.data;
				pic.style.minWidth = Pictre._settings.picture.maxWidth+"px";
				pic.style.maxWidth = Pictre._settings.picture.maxWidth+"px";
				pic.style.width = Pictre._settings.picture.maxWidth+"px";
				pic.innerHTML = "<div class='Pictre-loader'></div>";
				self._storage.overlay.image = pic;
				self._storage.overlay.iterator = a.data.id;
				document.body.style.height = window.innerHeight+"px";
				document.body.style.overflow = "hidden";
				a.style.opacity = "0.1";
				Pictre.gallery.overlay.showImage(pic);
				Pictre.gallery.overlay.onexit = function() {
					if(a) a.style.opacity = Pictre._settings.data.visited;
				};
		},
		get:{
			all:function() {
				return this.images;
			},
			total:function() {
				return this.images.length;
			}
		},
		is:{
			featuring:false
		},
		images:[],
		onready:function(){},
		overlay:{
			comments:null,
			div:null,
			exit:function() {
				if(!Pictre._storage.overlay.locked) {
					document.body.style.overflow = "auto";
					document.body.style.height = "auto";
					Pictre.gallery.is.featuring = false;
					this.remove();
					this.onexit();
				}
			},
			img:null,
			onexit:function() {},
			put:function() {
				if(!Pictre.gallery.overlay.div) {
					Pictre.gallery.overlay.div = document.createElement("div");
					Pictre.gallery.overlay.div.className = "Pictre-overlay";
					Pictre.gallery.overlay.div.style.display = "none";
					Pictre.gallery.overlay.div.tabIndex = "1";
				}
				Pictre.gallery.is.featuring = true;
				Pictre.gallery.overlay.div.addEventListener('click',function() {
					Pictre.gallery.overlay.exit();
				});
				Pictre.gallery.overlay.div.addEventListener('keydown',function(e) {
					if(e.keyCode == 27) Pictre.gallery.overlay.exit();
				});
				document.body.appendChild(Pictre.gallery.overlay.div);
				$(Pictre.gallery.overlay.div).fadeIn(Pictre._settings.speed);
				Pictre.gallery.overlay.div.focus();
				return Pictre.gallery.overlay.div;
			},
			showImage:function(b) {
				if(b) Pictre.gallery.overlay.wrapper = b;
				if(Pictre.gallery.overlay.div) return false;
				else {
					Pictre.gallery.overlay.div = document.createElement("div");
					Pictre.gallery.overlay.div.className = "Pictre-overlay";
					Pictre.gallery.overlay.div.style.display = "none";
					Pictre.gallery.overlay.div.tabIndex = "1";
				}
				var loader = document.createElement("div");
					loader.className = "Pictre-loader";
					loader.appended = false;
				Pictre.gallery.overlay.comments = document.createElement("div");
					Pictre.gallery.overlay.comments.appended = false;
					Pictre.gallery.overlay.comments.className = "Pictre-comments-wrapper";
				Pictre.gallery.overlay.img = new Image();
					Pictre.gallery.overlay.img.src = b.data.src;
					Pictre.gallery.overlay.img.data = b.data;
					Pictre.get.ui.imageOptions.is.disabled = Pictre.board.state > 1 ? false : true;
					b.addEventListener('mouseover',function() {
						Pictre.get.ui.imageOptions.put(this);
					});
					b.addEventListener('mouseout',function() {
						if(!Pictre.get.ui.imageOptions.is.active) Pictre.get.ui.imageOptions.hide();
					});
					Pictre.gallery.overlay.img.addEventListener('click',function(e) {
						e.stopPropagation();
						if(Pictre._storage.pictures[Pictre._storage.overlay.iterator+1]) {
							Pictre.gallery.overlay.replaceImage();
						} else {
							Pictre.gallery.overlay.exit();
						}
					});
					Pictre.gallery.overlay.div.addEventListener('keydown',function(e) {
						if(e.keyCode == 39 || e.keyCode == 32 || e.keyCode == 38) {
							e.stopPropagation();
							e.preventDefault();
							if(Pictre._storage.pictures[Pictre._storage.overlay.iterator+1]) {
								Pictre.gallery.overlay.replaceImage();
							}
						} else if(e.keyCode == 37 || e.keyCode == 40) {
							e.stopPropagation();
							e.preventDefault();
							if(Pictre._storage.pictures[Pictre._storage.overlay.iterator-1]) {
								Pictre.gallery.overlay.replaceImage({previous:true});
							}
						}
					});
					Pictre.gallery.overlay.img.addEventListener('load',function() {
						var offset = Pictre.gallery.overlay.img.width > 350 ? ((Pictre._settings.picture.maxWidth-Pictre.gallery.overlay.img.width)/2) : 200;
						b.innerHTML = "";
						Pictre.gallery.overlay.comments.innerHTML = "";
						b.appendChild(Pictre.gallery.overlay.img);
						addComments(Pictre.gallery.overlay.img);
						b.appendChild(Pictre.gallery.overlay.comments);
						Pictre.gallery.overlay.comments.appended = true;
						Pictre.gallery.overlay.image.position(b);
						Pictre.gallery.overlay.comments.style.bottom = (-Pictre.gallery.overlay.comments.clientHeight)+"px";
						Pictre.gallery.overlay.comments.addEventListener('click',function(e) {
							e.stopPropagation();
						});
						Pictre.get.ui.imageOptions.div = null;
						Pictre.get.ui.imageOptions.put(this.parentNode);
						function addComments(scope) {
							if(scope.data.comments.length) {
								Pictre.gallery.overlay.comments.innerHTML = "";
								var e = 0;
								var comments = [];
								for(var i=scope.data.comments.length-1;i>=0;i--) {
									comments.push(document.createElement("div"));
									if(i == scope.data.comments.length-1) comments[e].style.borderTop = "0";
									comments[e].className = "Pictre-comment";
									comments[e].innerHTML = "<span class='Pictre-comment-author'>"+scope.data.comments[i].author+"</span><p>"+scope.data.comments[i].body+"</p>";
									comments[e].children[0].style.right = offset+"px";
									Pictre.gallery.overlay.comments.appendChild(comments[e]);
									e++;
								}
							}
							var add = document.createElement("div");
							var author = Pictre._storage.comments.author || "Anonymous";
							var ct = "Add a comment...";
							add.className = "Pictre-comment";
							add.disabled = false;
							add.innerHTML = "<input type='text' class='Pictre-comment-input Pictre-comment-input-name' placeholder='"+author+"' maxlength='20'/><input type='text' class='Pictre-comment-input' placeholder='"+ct+"' maxlength='200'/>";
							if(Pictre.client.id >= 3 || (Pictre.client.id == 2 && Pictre.client.version.indexOf("5.1.") != -1)) {
								add.children[0].value = author;
								add.children[0].placeholder = "";
								add.children[0].addEventListener('focus',function() {
									if(this.value == author) this.value = '';
								});
								add.children[0].addEventListener('blur',function() {
									if(this.value == '') this.value = author;
								});
								add.children[1].value = ct;
								add.children[1].placeholder = "";
								add.children[1].addEventListener('focus',function() {
									if(this.value == ct) this.value = '';
								});
								add.children[1].addEventListener('blur',function() {
									if(this.value == '') this.value = ct;
								});
							}
							add.children[0].style.right = offset+"px";
							add.style.borderBottom = "0";
							add.addEventListener('keydown',function(e) {
								e.stopPropagation();
								if(e.keyCode == 13) {
									var name = add.children[0];
									var comment = add.children[1];
									if(comment.value != "" && comment.value != comment.placeholder && !add.disabled) {
										if(Pictre.terminal.isCommand(comment.value)) {
											var cmd = comment.value;
											add.disabled = true;
											name.disabled = true;
											comment.disabled = true;
											comment.value = "loading, please wait...";
											Pictre.terminal.parse({
												id:Pictre.gallery.overlay.img.data.dbid,
												src:Pictre.gallery.overlay.img.data.src,
												thumb:Pictre.gallery.overlay.img.data.thumb,
												command:cmd
											},function(log) {
												if(log.error) {
													add.disabled = false;
													comment.value = log.error;
													comment.removeAttribute('disabled');
													name.removeAttribute('disabled');
												}
											});
										} else {
											add.disabled = true;
											name.disabled = true;
											comment.disabled = true;
											var object = Pictre._storage.pictures[Pictre._storage.overlay.iterator];
											object.data.comments[object.data.comments.length] = {};
											object.data.comments[object.data.comments.length].author = name.value || name.placeholder;
											object.data.comments[object.data.comments.length].body = comment.value;
											object.data.comments.length++;
											Pictre.gallery.overlay.img.data = Pictre._storage.pictures[Pictre._storage.overlay.iterator].data;
											Pictre._storage.comments.author = object.data.comments[object.data.comments.length-1].author;
											comment.value = "loading, please wait...";
											var xhr = new XMLHttpRequest();
											xhr.open('POST',Pictre._settings.cloud.address+'data.php',true);
											xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
											xhr.send("type=store_comment&id="+object.data.dbid+"&author="+object.data.comments[object.data.comments.length-1].author+"&body="+object.data.comments[object.data.comments.length-1].body);
											xhr.addEventListener('readystatechange',function() {
												if(xhr.status == 200 && xhr.readyState == 4) {
													if(xhr.responseText == "success") {
														addComments(Pictre.gallery.overlay.img);
														Pictre.gallery.overlay.comments.style.bottom = (-Pictre.gallery.overlay.comments.clientHeight)+"px";
													} else {
														comment.value = "There was an error adding your comment, sorry about that!";
													}
												}
											});
										}
									}
								}
							});
							if(!scope.data.comments.length) add.style.borderTop = "0";
							Pictre.gallery.overlay.comments.appendChild(add);
						}
					});
				Pictre.gallery.overlay.div.appendChild(b);
				Pictre.gallery.overlay.put();
			},
			image:{
				get:function() {
					return Pictre._storage;
				},
				position:function(a) {
					if(Pictre.gallery.is.featuring) {
						if(Pictre.gallery.overlay.div) Pictre.gallery.overlay.div.style.height = window.innerHeight+"px";
						var img = a.childNodes[0];
						var width = img.width;
						var height = img.height;
						if(img.width > Pictre._settings.picture.maxWidth) {
							var w = img.width;
							var h = img.height;
							width = Pictre._settings.picture.maxWidth;
							height = Pictre._settings.picture.maxWidth * h / w;
						}
						a.style.width = width+"px";
						if(img.height <= Pictre.gallery.overlay.div.clientHeight) {
							var offset = window.innerHeight - height;
							a.style.marginTop = (offset/2)+"px";
						} else {
							a.style.marginTop = "5px";
						}
					}
				}
			},
			remove:function() {
				if(this.div) document.body.removeChild(this.div),this.div = null;
			},
			replaceImage:function(a) {
				var settings = {
					previous:false,
					id:null,
					object:null
				};
				if(typeof a == 'object') {
					for(var i in a) {
						settings[i] = a[i];
					}
				}
				if(settings.id || settings.object) {
					var object = document.getElementById("pic"+settings.id) || settings.object;
					Pictre._storage.overlay.iterator = Pictre._storage.pictures.indexOf(object);
				} else {
					if(settings.previous) Pictre._storage.overlay.iterator--;
					else Pictre._storage.overlay.iterator++;
				}
				var src = Pictre.gallery.overlay.img.src.split("/");
					src = src[src.length-1];
				var newSrc = Pictre._storage.pictures[Pictre._storage.overlay.iterator].data.src.split("/");
					newSrc = newSrc[newSrc.length-1];
				if(src != newSrc) Pictre.gallery.overlay.wrapper.innerHTML = "<div class='Pictre-loader'></div>";
				Pictre.gallery.overlay.img.src = Pictre._storage.pictures[Pictre._storage.overlay.iterator].data.src;
				Pictre.gallery.overlay.img.data = Pictre._storage.pictures[Pictre._storage.overlay.iterator].data;
				if(Pictre.gallery.overlay.img.data.comments.length) Pictre.gallery.overlay.comments.appended = true;
				else Pictre.gallery.overlay.comments.appended = false;
				Pictre._storage.pictures[Pictre._storage.overlay.iterator].style.opacity = Pictre._settings.data.visited;
			},
			wrapper:null
		}
	},
	init:function(a,b,c) {
		var spacer = document.createElement("div");
			spacer.className = "Pictre-spacer";
		if(b) Pictre._settings.cloud.datadir=b;
		if(c) Pictre._settings.cloud.address=c;
		Pictre.get.ui.menu.put(document.body,a);
		Pictre.client.detect();
		Pictre.board.detect();
		if(Pictre.board.is.set) {
			if(Pictre.board.get().toLowerCase().match(/[^a-z0-9\-\.\+\_]/gi)) {
				var err = document.createElement("p");
				err.innerHTML = "404. The album you are looking for cannot be found.";
				err.className = "Pictre-home-wrapper-about";
				Pictre.get.ui.notice("This album does not exist as it contains invalid characters in its name.");
				err.appendChild(spacer);
				Pictre.get.ui.home.put().appendTo(a).appendChild(err);
			} else if(Pictre._settings.pages.restricted.indexOf(Pictre.board.get().toLowerCase()) != -1) {
				var err = document.createElement("p");
				err.innerHTML = "403. The album you are looking for is restricted. Try another one by typing it above or type another album address.";
				err.className = "Pictre-home-wrapper-about";
				Pictre.get.ui.notice("This album is private or restricted. Please try another one.");
				err.appendChild(spacer);
				Pictre.get.ui.home.put().appendTo(a).appendChild(err);
			} else {
				Pictre.board.exists = true;
				var wrapper = document.createElement("div");
				wrapper.id = "Pictre-wrapper";
				a.appendChild(wrapper);
				this.set.wrapper(wrapper);
				Pictre.get.ui.notice("Loading, please wait...");
				Pictre._settings.data.condition = "album = \'"+escape(Pictre.board.get().toLowerCase())+"\'";
				Pictre.get.db({album:true,from:'all',where:Pictre._settings.data.condition,limit:Pictre._settings.data.limit.pageload},function(data) {
					Pictre.load(data);
				});
				window.addEventListener("dragover",function() {
					if(!Pictre.gallery.is.featuring && !Pictre.is.spotlight && Pictre._settings.allowUploads) Pictre.get.ui.upload.put();
				});
				window.addEventListener('hashchange',function() {
					Pictre.get.hash();
				});
			}
		} else {
			if(Pictre.is.updating) Pictre.get.ui.notice("Updates are currently in progress...");
			Pictre.get.ui.menu.addButton({
				id:'about',
				name:'about',
				title:'What is Pictre?'
			}).on('click',function() {
				var body = '<p><span class="brand">Pictre</span> is a picture album library. It allows you to create as many albums as needed, each with a unique name assigned by you.</p>';
				body += '<p>Each album is assigned its own URL, so accessing it is as simple as typing pictre.org/albumname. Because privacy is very important when making albums, all albums are considered private.</p>'
				body += '<p>No one except you and the people you share your album\'s name with, will have access to your album.</p>';
				body += '<p>Made by Juan Vallejo.</p><p style="font-size:0.8em;margin-top:1px;"><a target="_blank" href="mailto:juuanv@gmail.com">You can contact me here.</a></p>';
				Pictre.get.ui.warning.put({
					header:'About',
					body:body,
					style:false
				});
			});
			var about = document.createElement("p");
				about.innerHTML = "<b class='brand'>Pictre</b> is a collection of cloud photo albums. You can view or create picture albums based on interests, people, or families. ";
				about.innerHTML += "<span>To get started, simply type an album name above.</span>";
				about.className = "Pictre-home-wrapper-about";
				about.appendChild(spacer);
			Pictre.get.ui.home.put().appendTo(a).appendChild(about);
		}
	},
	is:{
		busy:false,
		done:false,
		loading:false,
		loaded:false,
		scrollingDown:false,
		spotlight:false,
		updating:false
	},
	load:function(a,b,c) {
		var self = this;
		var settings = {
			method:'replace'
		};
		if(typeof b == "object") {
			for(var i in b) {
				settings[i] = b[i];
			}
		}
		if(a) {
			if(settings.method == "append") {
				for(var i=0;i<a.length;i++) {
					Pictre.create.picture(a[i],settings.method);
				}
				if(typeof c == "function") c.call(Pictre);
			} else if(settings.method == "prepend") {
				if(!Pictre._storage.pictures.length) {
					Pictre._404.remove();				
				}
				for(var i=a.length-1;i>=0;i--) {
					Pictre.create.picture(a[i],settings.method);
				}
				for(var i=0;i<Pictre._storage.pictures.length;i++) {
					Pictre._storage.pictures[i].data.id = i;
				}
				var n = parseInt(Pictre._storage.data.totalDiv.innerHTML)
				Pictre._storage.data.totalDiv.innerHTML = n+a.length;
			} else if(settings.method == "replace") {
				this._storage.iterator = 0;
				this._storage.pictures = [];
				while(Pictre._settings.wrapper.hasChildNodes()) {
					Pictre._settings.wrapper.removeChild(Pictre._settings.wrapper.lastChild);
				}
				for(var i=0;i<a.length;i++) {
					Pictre.create.picture(a[i]);
				}
				if(!Pictre._storage.pictures.length) {
					Pictre._404.put("There doesn't seem to be anything here. Be the first to add pictures to this album!");
					if(Pictre._settings.allowUploads) Pictre.get.ui.upload.put();
				} else {
					Pictre.get.hash();
				}
				if(Pictre.is.updating) Pictre.get.ui.notice("Updates are currently in progress... Some features may not work.");
				else Pictre.get.ui.notice(Pictre.board.get()+" Picture Board",a.total);
				Pictre._storage.data.total = a.total;
				Pictre._settings.data.album = Pictre.board.get().toLowerCase();
				Pictre.get.ui.menu.addButton({
					id:'upload',
					name:'upload',
					title:'Upload pictures to this board'
				}).on('click',function() {
					if(Pictre.is.spotlight) {
						Pictre.spotlight.remove();
						if(Pictre.get.ui.menu.hasButton('back')) {
							Pictre.get.ui.menu.removeButton('back');
							if(Pictre.board.state > 0) {
								if(Pictre.board.state == 1) {
									Pictre.get.ui.menu.showButton('lock');
								} else {
									Pictre.get.ui.menu.showButton('unlock');
								}
							}
						}
					}
					if(Pictre._settings.allowUploads) Pictre.get.ui.upload.put();
					else Pictre.get.ui.notice("Uploads have been disabled for this album.");
				});	
				if(a.hasOwnProperty('kind')) {
					Pictre.board.set.state(a.kind);
				}
			}
			Pictre._settings.data.anchor+=a.length;
		}
		return Pictre;
	},
	properties:{
		className:"Pictre-pic"
	},
	set:{
		wrapper:function(a,b) {
			Pictre._settings.wrapper = a;
			if(typeof b == "function") b.call(Pictre);
		}
	},
	spotlight:{
		_wrapper:null,
		feature:function(a) {
			if(this._wrapper) document.body.removeChild(this._wrapper);
			var self = this;
			var width;
			var clientWidth;
			Pictre._storage.overlay.iterator = a.data.id;
			if(!Pictre.is.spotlight) {
				if(document.body.scrollTop) {
					Pictre._storage.scrollTop = document.body.scrollTop;
				} else {
					Pictre._settings.spotlight.useDocumentElement = true;
					Pictre._storage.scrollTop = document.documentElement.scrollTop;
				}
			} slideWrapper();
			Pictre.is.spotlight = true;
			if(!Pictre.get.ui.menu.hasButton('back')) {
				if(Pictre.get.ui.menu.hasButton('lock')) Pictre.get.ui.menu.hideButton('lock');
				if(Pictre.get.ui.menu.hasButton('unlock')) Pictre.get.ui.menu.hideButton('unlock');
				Pictre.get.ui.menu.addButton({
					id:'back',
					name:'back',
					title:'Go back to the album'
				}).on('click',function() {
					self.remove();
					Pictre.get.ui.menu.removeButton('back');
					if(Pictre.board.state > 0) {
						if(Pictre.board.state == 1) {
							Pictre.get.ui.menu.showButton('lock');
						} else {
							Pictre.get.ui.menu.showButton('unlock');
						}
					}
				});
			}
			this._wrapper = document.createElement("div");
			this._wrapper.id = "Pictre-spotlight-wrapper";
			var comments = document.createElement("div");
				comments.id = "Pictre-spotlight-wrapper-comments";
				comments.style.width = "500px";
				comments.width = parseInt(comments.style.width.split("px")[0]);
			var pic = document.createElement("div");
				pic.id = "Pictre-spotlight-wrapper-pic";
				pic.innerHTML = "<p>Loading, please wait...</p>";
			var img = new Image();
				img.src = a.data.src;
				img.addEventListener('load',function() {
					var b = img.data ? img : a;
					pic.innerHTML = "";
					comments.innerHTML = "";
					pic.style.width = img.width+"px";
					pic.appendChild(img);
					width = img.width;
					clientWidth = pic.clientWidth;
					pic.padding = parseInt(window.getComputedStyle(pic).getPropertyValue('padding-left').split("px")[0])*2+4;
					position();
					comments.style.display = "block";
					comments.style.top = (pic.clientHeight + 50)+"px";
					loadComments();
					function loadComments() {
						comments.innerHTML = "";
						var placeholder = Pictre._storage.comments.author || "Anonymous";
						var addComment = document.createElement("div");
							addComment.className = "comment";
							addComment.style.marginBottom = "33px";
							addComment.style.borderBottom = "1px solid rgb(61,65,65)";
							addComment.innerHTML = "<p><input type='text' placeholder='Add a comment...'/></p>";
							addComment.innerHTML += "<div class='author' style='border-bottom:1px solid rgb(0,0,0);'><input type='text' placeholder='"+placeholder+"'/></div>";
							var val = addComment.children[0].children[0];
							addComment.addEventListener('keydown',function(e) {
								if(e.keyCode == 13 && val.value != "") {
									var name = addComment.children[1].children[0];
									if(Pictre.terminal.isCommand(val.value)) {
										var cmd = val.value;
										val.disabled = true;
										name.disabled = true;
										val.value = "loading, please wait...";
										Pictre.terminal.parse({
											id:a.data.dbid,
											src:a.data.src,
											thumb:a.data.thumb,
											command:cmd
										},function(log) {
											if(log.error) {
												val.value = log.error;
												val.removeAttribute('disabled');
												name.removeAttribute('disabled');
											}
										});
									} else {
										if(name.value != "") Pictre._storage.comments.author = name.value;
										b.data.comments[b.data.comments.length] = {};
										b.data.comments[b.data.comments.length].author = name.value || name.placeholder;
										b.data.comments[b.data.comments.length].body = val.value;
										b.data.comments.length++;
										val.disabled = true;
										val.value = "loading, please wait...";
										var xhr = new XMLHttpRequest();
											xhr.open('POST',Pictre._settings.cloud.address+'data.php',true);
											xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
											xhr.send("type=store_comment&id="+b.data.dbid+"&author="+b.data.comments[b.data.comments.length-1].author+"&body="+b.data.comments[b.data.comments.length-1].body);
											xhr.addEventListener('readystatechange',function() {
												if(xhr.readyState == 4 && xhr.status == 200) {
													if(xhr.responseText == "success") {
														val.value = "";
														loadComments();
													} else {
														val.value = xhr.responseText;
													}
													val.removeAttribute('disabled');
												}
											});
									}
								}
							});
						comments.appendChild(addComment);
						if(b.data.comments.length) {
							comments.style.borderBottomColor = "rgb(61,65,65)";
							for(var i = b.data.comments.length-1;i>=0;i--) {
								var comment = document.createElement("div");
									comment.className = "comment";
									comment.innerHTML = "<p>"+b.data.comments[i].body+"</p>";
									comment.innerHTML += "<div class='author'>"+b.data.comments[i].author+"</div>";
								comments.appendChild(comment);
								if(self._wrapper) self._wrapper.style.height = window.innerHeight+"px";
							}
						} else {
							comments.style.borderBottomColor = "transparent";
						}
						var spacer = document.createElement("div");
						spacer.className = "Pictre-spacer";
						if(b.data.comments.length) spacer.style.borderTop = "1px solid rgb(61,65,65)";
						comments.appendChild(spacer);
					}
				});
				img.addEventListener('click',function(e) {
					if(Pictre._storage.pictures[Pictre._storage.overlay.iterator+1]) {
						Pictre._storage.overlay.iterator++;
						this.data = Pictre._storage.pictures[Pictre._storage.overlay.iterator].data;
						window.location.assign("#"+this.data.dbid);
						Pictre._storage.pictures[Pictre._storage.overlay.iterator].style.opacity = Pictre._settings.data.visited;
					} else {
						self.remove();
					}
				});
			this._wrapper.appendChild(pic);
			this._wrapper.appendChild(comments);
			document.body.appendChild(this._wrapper);
			this._wrapper.style.left = this._wrapper.clientWidth+"px";
			slideWrapper();
			clientWidth = pic.clientWidth;
			pic.padding = parseInt(window.getComputedStyle(pic).getPropertyValue('padding-left').split("px")[0])*2+4;
			window.addEventListener('resize',function() {
				position();
			});
			function slideWrapper() {
				if(Pictre._settings.spotlight.useDocumentElement) {
					$(document.body).animate({scrollTop:0},Pictre._settings.spotlight.transitionSpeed);
					$(document.documentElement).animate({scrollTop:0},Pictre._settings.spotlight.transitionSpeed,function() {
						slide();
					});
				} else {
					$(document.body).animate({scrollTop:0},Pictre._settings.spotlight.transitionSpeed,function() {
						slide();
					});
				}
				function slide() {
					$(Pictre._settings.wrapper.parentNode).animate({
						left:(-Pictre._settings.wrapper.parentNode.clientWidth)+"px"
					},Pictre._settings.spotlight.transitionSpeed);
					$(self._wrapper).animate({
						left:0
					},Pictre._settings.spotlight.transitionSpeed,function() {
						position();
					});
				}
			}
			function position() {
				if(Pictre.is.spotlight) {
					document.body.scrollLeft = 0;
					Pictre._settings.wrapper.parentNode.style.left = (-Pictre._settings.wrapper.parentNode.clientWidth)+"px"
					comments.style.left = (window.innerWidth / 2 - comments.width / 2)+"px";
					if(window.innerWidth < comments.width) {
						comments.style.left = "0";
						comments.style.width = (window.innerWidth-4)+"px";
					}
					if(window.innerWidth < clientWidth) {
						pic.style.left = "0";
						pic.style.width = (window.innerWidth-pic.padding)+"px";
						img.style.width = (window.innerWidth-pic.padding)+"px";
					} else {
						pic.style.width = width+"px";
						img.style.width = width+"px";
						pic.style.left = (window.innerWidth / 2 - pic.offsetWidth / 2)+"px";
						comments.style.left = (window.innerWidth / 2 - comments.width / 2)+"px";
					}
					comments.style.top = (pic.clientHeight + 50)+"px";
				}
			}
		},
		remove:function() {
			var self = this;
			if(this._wrapper) {
				document.body.style.overflowY = "auto";
				$(this._wrapper).animate({
					left:Pictre.spotlight._wrapper.clientWidth+"px"
				},Pictre._settings.spotlight.transitionSpeed,function() {
					document.body.removeChild(self._wrapper);
					self._wrapper = null;
				});
				$(Pictre._settings.wrapper.parentNode).animate({
					left:0
				},Pictre._settings.spotlight.transitionSpeed);
				if(Pictre._storage.chisel.queued) {
					Pictre.chisel();
					Pictre._storage.chisel.queued = false;
				}
				if(Pictre._storage.scrollTop !== null) {
					if(Pictre._settings.spotlight.useDocumentElement) document.documentElement.scrollTop = Pictre._storage.scrollTop;
					else document.body.scrollTop = Pictre._storage.scrollTop;
				}
				Pictre.is.spotlight = false;
			} else {
				if(Pictre._storage.scrollTop === null) Pictre._storage.chisel.queued = false;
			}
		}
	},
	terminal:{
		log:{
			error:false,
			success:false
		},
		isCommand:function(a) {
			if(a.match(/^(\/pictre\ )/gi)) return true;
			else return false;
		},
		parse:function(a,b) {
			this.log.error = "";
			var self = this;
			var settings = {
				command:null,
				id:null,
				src:null,
				thumb:null
			};
			if(typeof a == "object") {
				for(var i in a) {
					settings[i] = a[i];
				}
			} else settings.command = a;
			if(settings.command.match(/^(\/pictre\ )(delete|borrar|radera)/gi)) {
				if(Pictre.board.state < 2) {
					self.log.error = "You are not authorized to use that command.";
					if(typeof b == "function") b.call(Pictre.terminal,Pictre.terminal.log);
				} else if(settings.id && settings.src && settings.thumb) {
					var xhr = new XMLHttpRequest();
						xhr.open('POST',Pictre._settings.cloud.address+'data.php',true);
						xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
						xhr.send("type=command&command=delete&id="+settings.id+"&source="+encodeURIComponent(settings.src)+"&thumb="+encodeURIComponent(settings.thumb));
						xhr.addEventListener('readystatechange',function() {
							if(xhr.readyState == 4 && xhr.status == 200) {
								if(xhr.responseText == "success") {
									self.log.success = true;
									if(Pictre.is.spotlight) Pictre.spotlight.remove();
									else if(Pictre.gallery.is.featuring) Pictre.gallery.overlay.div.click();
									var p = Pictre._storage.pictures[Pictre._storage.overlay.iterator];
									var margin = window.getComputedStyle(p).getPropertyValue('margin-top').split("px")[0];
									var height = p.offsetHeight - parseInt(margin*2);
									p.innerHTML = "<p style='display:table;height:100%;width:100%;'><span style='display:table-cell;width:100%;text-align:center;vertical-align:middle;'>Picture deleted</span></p>";
									p.style.height = height+"px";
									p.style.opacity = "0.6";
									Pictre._storage.pictures.splice(Pictre._storage.overlay.iterator,1);
									Pictre._storage.data.deleted++;
									for(var i=0;i<Pictre._storage.pictures.length;i++) {
										Pictre._storage.pictures[i].data.id = i;
									}
									$(p).fadeOut('slow',function() {
										Pictre.chisel();
										var count = parseInt(Pictre._storage.data.totalDiv.innerHTML);
										Pictre._storage.data.totalDiv.innerHTML = count-1;
									});
								} else self.log.error = "Pictre encountered an error and could not process your command, sorry about that! ("+xhr.responseText+")";
								if(typeof b == "function") b.call(Pictre.terminal,Pictre.terminal.log);
							}
						});
				} else {
					self.log.error = "You have missing parameters for that command.";
					if(typeof b == "function") b.call(Pictre.terminal,Pictre.terminal.log);
				}
			} else if(settings.command.match(/^(\/pictre\ )(filecheck)/gi)) {
				console.log("Preloading "+Pictre._storage.data.total+" images, please wait...");
				Pictre.is.busy = true;
				if(Pictre.gallery.is.featuring) Pictre.gallery.overlay.exit();
				var oldRequest = Pictre._settings.data.limit.request;
				Pictre._settings.data.limit.request = Pictre._storage.data.total;
				Pictre.get.db({from:'all'},function(data) {
					console.log("Appending images to document...");
					Pictre.load(data,{method:'append'},function() {
						console.log("Checking for file consistency...");
						var img = [];
						var loaded = 0;
						var errors = [];
						for(var i = 0;i<Pictre._storage.pictures.length;i++) {
							img.push(new Image());
							img[i].src = Pictre._storage.pictures[i].data.src;
							img[i].data = Pictre._storage.pictures[i].data;
							img[i].style.display = "none";
							img[i].addEventListener('load',function() {
								loaded++;
								console.log("image "+loaded+" loaded");
								if(loaded == Pictre._storage.data.total) _runonload();
							});
							img[i].addEventListener('error',function() {
								loaded++;
								errors.push(this);
								if(loaded == Pictre._storage.data.total) _runonload();
							});
							document.body.appendChild(img[i]);
							Pictre._settings.data.limit.request = oldRequest;
							Pictre.is.busy = false;
						}
						function _runonload() {
							if(errors.length) {
								console.log(errors.length+" errors detected, listing corrupted files below...");
								for(var i=0;i<errors.length;i++) {
									console.log("Image "+i+" error: ");
									console.log(errors[i].data);
								}
							}	
							else console.log("All files exist. No errors detected... Restructuring Pictre, please wait..."),Pictre.chisel();
						}
					});
				});
			} else {
				self.log.error = "Command not found: "+settings.command;
				if(typeof b == "function") b.call(self,self.log)
			}
		}
	}
};window.Pictre = Pictre;})(window,document);