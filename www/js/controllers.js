angular.module('your_app_name.controllers', ['ngCordova.plugins.nativeStorage'])

	.controller('TestCtrl', function ($cordovaBarcodeScanner, $cordovaCamera, $state, $cordovaLaunchNavigator, $localstorage, $cordovaNativeStorage, $ionicPopup, $ionicLoading, GN7_API_URL, $http, $scope, $stateParams) {
		function pad_with_zeroes(number, length) {
			var my_string = '' + number;
			while (my_string.length < length) {
				my_string = '0' + my_string;
			}
			return my_string;
		}

		var idofertaenvio = $localstorage.get('idofertaenvio');
		$scope.id = $stateParams.id;
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$scope.user = user;
			$ionicLoading.show({
				template: 'Cargando...',
			});

			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				var envio = {};
				if (data.data.data !== null) {
					envio = data.data.data;
					//$scope.envio = envio;
					$scope.pedido = envio.pedido_detalles[$scope.id];
					$scope.fid = pad_with_zeroes($scope.pedido.idpedido_detalle, 3);
				} else {
					var request = $http({
						method: "get",
						url: GN7_API_URL + 'oferta/obtenerofertas/' + user.usuario.idconductor
					});
					request.then(function (data) {
						if (data.data.data.rows.length > 0) {
							envio = data.data.data.rows[idofertaenvio].ofertaenvio;
							console.log(envio);
							//$scope.envio = envio;
							$scope.pedido = envio.pedido_detalles[$scope.id];
							$scope.fid = pad_with_zeroes($scope.pedido.idpedido_detalle, 3);
						} else {
							$state.go('app.envios');
						}
						$ionicLoading.hide();
					}).catch(function (e) {
						$ionicLoading.hide();
						$ionicPopup.alert({
							template: JSON.stringify(e)
						});
					});
				}
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});
		$scope.mapa = function (envio, punto) {
			var lat2 = punto == "ORIGEN" ? envio.punto_latitud_carga : envio.punto_latitud_descarga;
			var lon2 = punto == "ORIGEN" ? envio.punto_longitud_carga : envio.punto_longitud_descarga;

			var start = {};
			var dest;

			if (lat2 && lon2)
				dest = [lat2, lon2];
			else
				dest = punto == "ORIGEN" ? envio.direccion_carga : envio.direccion_descarga;

			$cordovaLaunchNavigator.navigate(dest, start).then(function () {
				console.log("Navigator launched");
			}, function (err) {
				console.log(err);
			});
		}
		$scope.sign = function (idpedido, id) {
			$state.go('app.firma', { idpedido: idpedido, id: id });
		}
		$scope.takePicture = function (idpedido) {
			var options = {
				quality: 75,
				destinationType: Camera.DestinationType.DATA_URL,
				sourceType: Camera.PictureSourceType.CAMERA,
				allowEdit: true,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 300,
				targetHeight: 300,
				popoverOptions: CameraPopoverOptions,
				saveToPhotoAlbum: false
			};

			$cordovaCamera.getPicture(options).then(function (imageData) {
				$ionicLoading.show({
					template: 'Guardando...',
				});
				var datos = {
					imagen: "data:image/jpeg;base64," + imageData,
					data: { descripcion: "imagen" }
				}
				console.log(datos);
				var request = $http({
					method: "post",
					url: GN7_API_URL + 'pedido_detalle/addimagen/IMAGEN_PD/' + idpedido,
					data: datos
				});
				request.then(function (data) {
					if (data.data.status) {
						console.log(data);
						$ionicPopup.alert({
							template: "Imagen guardada"
						});
					}
					else
						$ionicPopup.alert({
							template: "No se pudo guardar"
						});
					$ionicLoading.hide();
				}).catch(function (e) {
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: JSON.stringify(e)
					});
				});
				/*$scope.imgURI = "data:image/jpeg;base64," + imageData;
				$ionicPopup.alert({
				  template: 'Imagen guardada'
				});*/
			}, function (err) {
				console.log(err);
				// An error occured. Show a message to the user
			});
		}
		$scope.scanBarcode = function (idpedido) {
			$cordovaBarcodeScanner
				.scan({ showTorchButton: true })
				.then(function (result) {
					console.log(result);
					if (!result.cancelled) {
						$ionicLoading.show({
							template: 'Guardando...',
						});
						var data = {
							n_codigo_barras: result.text
						}
						var request = $http({
							method: "put",
							url: GN7_API_URL + 'pedido_detalle/' + idpedido,
							data: data
						});
						request.then(function (data) {
							if (data.data.status) {
								console.log(data);
								$ionicPopup.alert({
									template: "Codigo de Barra Guardado"
								});
							}
							else
								$ionicPopup.alert({
									template: "No se pudo guardar"
								});
							$ionicLoading.hide();
						}).catch(function (e) {
							$ionicLoading.hide();
							$ionicPopup.alert({
								template: JSON.stringify(e)
							});
						});
					}
					/*$ionicPopup.alert({
					template: "Codigo de Barra Guardado\n" +
						"Codigo: " + result.text + "\n" +
						"Formato: " + result.format + "\n" +
						"Cancelado: " + result.cancelled
				});*/
				}, function (error) {
					console.log(error);
					// An error occurred
				});
		}
	})
	.controller('RechazadosCtrl', function ($ionicPopup, $stateParams, $localstorage, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth() + 1; //January is 0!
		var yyyy = today.getFullYear();
		if (dd < 10) {
			dd = '0' + dd
		}
		if (mm < 10) {
			mm = '0' + mm
		}
		var fecha = yyyy + '-' + mm + '-' + dd;
		var envio = {};
		var carga = [];
		var descarga = [];
		$scope.producto = $localstorage.getObject('producto');
		var id = $scope.producto.idpedido_detalle_producto;
		var idp = $stateParams.id;
		$scope.idp = $stateParams.id;
		var idestado_pedido_detalle = 0;
		var idpedidop = 0;
		var idcliente = 0;
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$scope.user = user;
			$ionicLoading.show({
				template: 'Cargando...',
			});
			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				envio = data.data.data;
				if (envio.pedido_detalles[idp].pedido_detalle_estado_pedido_detalles[0] != undefined)
					idestado_pedido_detalle = envio.pedido_detalles[idp].pedido_detalle_estado_pedido_detalles[0].estado_pedido_detalle.idestado_pedido_detalle;
				idpedidop = envio.pedido_detalles[idp].idpedido;
				$ionicLoading.show({
					template: 'Cargando...',
				});
				$http.get(GN7_API_URL + 'estado_pedido_detalle/PUNTO DE DESCARGA/' + envio.pedido_detalles[idp].idpedido).then(function (data) {
					$ionicLoading.hide();
					var dCarga = data.data.data;
					dCarga.forEach(function (entry) {
						descarga.push(entry.idestado_pedido_detalle);
					});
					console.log(descarga);
					if (descarga.indexOf(idestado_pedido_detalle) > -1) {
						$scope.producto.rechazadas = $scope.producto.rechazadas_destino;
						$scope.producto.rechazadas_unidad = $scope.producto.rechazadas_unidad_destino;
						$scope.producto.observacion_rechazadas = $scope.producto.observacion_rechazadas_destino;
					} else {
						$scope.producto.rechazadas = $scope.producto.rechazadas_origen;
						$scope.producto.rechazadas_unidad = $scope.producto.rechazadas_unidad_origen;
						$scope.producto.observacion_rechazadas = $scope.producto.observacion_rechazadas_origen;
					}
					if (idpedidop > 0) {
						$ionicLoading.show({
							template: 'Cargando...',
						});
						$http.get(GN7_API_URL + 'pedido/' + idpedidop).then(function (data) {
							$ionicLoading.hide();
							idcliente = data.data.data.idcliente;
							if (idcliente > 0) {
								$ionicLoading.show({
									template: 'Cargando...',
								});
								$http.get(GN7_API_URL + 'tipologia/cliente/' + idcliente).then(function (data) {
									$ionicLoading.hide();
									$scope.opciones = data.data.data;
								}).catch(function (e) {
									$ionicLoading.hide();
									$ionicPopup.alert({
										template: JSON.stringify(e)
									});
								});
							}
						}).catch(function (e) {
							$ionicLoading.hide();
							$ionicPopup.alert({
								template: JSON.stringify(e)
							});
						});
					}
					/*$http.get(GN7_API_URL+'estado_pedido_detalle/PUNTO DE DESCARGA/'+envio.pedido_detalles[idp].idpedido).then(function(data) {
						$ionicLoading.hide();
						var dDescarga = data.data.data;
						dDescarga.forEach(function(entry) {
							descarga.push(entry.idestado_pedido_detalle);
						});
						console.log(descarga);
					}).catch(function (e) {
						$ionicLoading.hide();
						$ionicPopup.alert({
							 template: JSON.stringify(e)
						 });
					});		*/
				}).catch(function (e) {
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: JSON.stringify(e)
					});
				});
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});
		$scope.guardar = function () {
			$ionicLoading.show({
				//template: 'Cargando Envío...',
			});
			if (descarga.indexOf(idestado_pedido_detalle) > -1) {
				var data = {
					rechazadas_destino: $scope.producto.rechazadas,
					rechazadas_unidad_destino: $scope.producto.rechazadas_unidad,
					observaciones_rechazadas_destino: $scope.producto.observacion_rechazadas,
					idtipologia: $scope.producto.idtipologia,
					fecha_rechazada_destino: fecha
				}
			} else {
				console.log('entro');
				var data = {
					rechazadas_origen: $scope.producto.rechazadas,
					rechazadas_unidad_origen: $scope.producto.rechazadas_unidad,
					observacion_rechazadas_origen: $scope.producto.observacion_rechazadas,
					idtipologia: $scope.producto.idtipologia,
					fecha_rechazada_origen: fecha
				}
			}
			console.log(data);
			var request = $http({
				method: "put",
				url: GN7_API_URL + 'pedido_detalle_producto/' + id,
				data: data
			});
			request.then(function (data) {
				console.log(data);
				if (data.data.status) {
					$state.go('app.productos', { id: idp });
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: "Producto Rechazado Guardado"
					});
				} else
					$ionicPopup.alert({
						template: "No se pudo guardar"
					});
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}
		$scope.cancelar = function () {
			$state.go('app.productos', { id: idp });
		}
	})
	.controller('FaltantesCtrl', function ($ionicPopup, $stateParams, $localstorage, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth() + 1; //January is 0!
		var yyyy = today.getFullYear();
		if (dd < 10) {
			dd = '0' + dd
		}
		if (mm < 10) {
			mm = '0' + mm
		}
		var fecha = yyyy + '-' + mm + '-' + dd;
		var envio = {};
		var carga = [];
		var descarga = [];
		$scope.producto = $localstorage.getObject('producto');
		var id = $scope.producto.idpedido_detalle_producto;
		var idp = $stateParams.id;
		$scope.idp = $stateParams.id;
		var idestado_pedido_detalle = 0;

		$cordovaNativeStorage.getItem('user').then(function (user) {
			$scope.user = user;
			$ionicLoading.show({
				template: 'Cargando...',
			});
			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				envio = data.data.data;
				if (envio.pedido_detalles[idp].pedido_detalle_estado_pedido_detalles[0] != undefined)
					idestado_pedido_detalle = envio.pedido_detalles[idp].pedido_detalle_estado_pedido_detalles[0].estado_pedido_detalle.idestado_pedido_detalle;
				$http.get(GN7_API_URL + 'estado_pedido_detalle/PUNTO DE DESCARGA/' + envio.pedido_detalles[idp].idpedido).then(function (data) {
					$ionicLoading.hide();
					var dCarga = data.data.data;
					dCarga.forEach(function (entry) {
						descarga.push(entry.idestado_pedido_detalle);
					});
					console.log(descarga);
					if (descarga.indexOf(idestado_pedido_detalle) > -1) {
						$scope.producto.faltantes = $scope.producto.faltantes_destino;
						$scope.producto.faltantes_unidad = $scope.producto.faltantes_unidad_destino;
						$scope.producto.observacion_faltantes = $scope.producto.observacion_faltantes_destino;
					} else {
						$scope.producto.faltantes = $scope.producto.faltantes_origen;
						$scope.producto.faltantes_unidad = $scope.producto.faltantes_unidad_origen;
						$scope.producto.observacion_faltantes = $scope.producto.observacion_faltantes_origen;
					}
					/*$http.get(GN7_API_URL+'estado_pedido_detalle/PUNTO DE DESCARGA/'+envio.pedido_detalles[idp].idpedido).then(function(data) {
						$ionicLoading.hide();
						var dDescarga = data.data.data;
						dDescarga.forEach(function(entry) {
							descarga.push(entry.idestado_pedido_detalle);
						});
						console.log(descarga);
					}).catch(function (e) {
						$ionicLoading.hide();
						$ionicPopup.alert({
							 template: JSON.stringify(e)
						 });
					});*/
				}).catch(function (e) {
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: JSON.stringify(e)
					});
				});
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});

		$scope.guardar = function () {
			$ionicLoading.show({
				//template: 'Cargando Envío...',
			});
			if (descarga.indexOf(idestado_pedido_detalle) > -1) {
				var data = {
					faltantes_destino: $scope.producto.faltantes,
					faltantes_unidad_destino: $scope.producto.faltantes_unidad,
					observacion_faltantes_destino: $scope.producto.observacion_faltantes,
					fecha_faltantes_destino: fecha
				}
			} else {
				var data = {
					faltantes_origen: $scope.producto.faltantes,
					faltantes_unidad_origen: $scope.producto.faltantes_unidad,
					observacion_faltantes_origen: $scope.producto.observacion_faltantes,
					fecha_faltantes_origen: fecha
				}
			}
			var request = $http({
				method: "put",
				url: GN7_API_URL + 'pedido_detalle_producto/' + id,
				data: data
			});
			request.then(function (data) {
				if (data.data.status) {
					$state.go('app.productos', { id: idp });
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: "Producto Faltante Guardado"
					});
				} else
					$ionicPopup.alert({
						template: "No se pudo guardar"
					});
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}
		$scope.cancelar = function () {
			$state.go('app.productos', { id: idp });
		}
	})
	.controller('VacioCtrl', function (BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		$cordovaNativeStorage.getItem('user').then(function (user) {
			if (user.usuario.tipo_usuario == 'CONDUCTOR')
				$state.go('app.envios');
			if (user.usuario.tipo_usuario == 'AFILIADO')
				$state.go('app.solicitud');
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});
	})
	.controller('GuiasCtrl', function ($ionicPopup, $localstorage, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		$scope.envio = {};
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$ionicLoading.show({
				template: 'Cargando...',
			});
			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				if (data.data.data !== null) {
					$scope.envio = data.data.data;
					console.log($scope.envio);
					if ($scope.envio.guias_entregadas == null)
						$scope.entre = false;
					else
						$scope.entre = true;
					if ($scope.envio.guias_devueltas == null)
						$scope.devu = false;
					else
						$scope.devu = true;
					$scope.envio.selected_tab = 0;
				}
				else
					$state.go('app.envios');
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});
		$scope.guardar = function () {
			$ionicLoading.show();
			if ($scope.envio.selected_tab == 0)
				var data = { guias_entregadas: $scope.envio.guias_entregadas };
			if ($scope.envio.selected_tab == 1)
				var data = { guias_devueltas: $scope.envio.guias_devueltas };
			var request = $http({
				method: "put",
				url: GN7_API_URL + 'envio/' + $scope.envio.idenvio,
				data: data
			});
			request.success(function (data) {
				if (data.status) {
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: "Cantidad de Guias Guardadas"
					});
					$state.go('app.envios');
				} else {
					$ionicPopup.alert({
						template: "No se pudo guardar"
					});
				}
				$ionicLoading.hide();
			}).error(function (err) {
				$ionicPopup.alert({
					template: err.msg
				});
				$ionicLoading.hide();
			});
		}
		$scope.cancelar = function () {
			$state.go('app.envios');
		}
	})
	.controller('ViajeCtrl', function ($localstorage, $ionicPopup, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth() + 1; //January is 0!
		var yyyy = today.getFullYear();
		if (dd < 10) {
			dd = '0' + dd
		}
		if (mm < 10) {
			mm = '0' + mm
		}
		today = yyyy + '-' + mm + '-' + dd;
		var envio = {};

		$cordovaNativeStorage.getItem('user').then(function (user) {
			$ionicLoading.show({
				template: 'Cargando...',
			});

			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				if (data.data.data !== null) {
					envio = data.data.data;
					$scope.data = {
						choice: ''
					};

					$scope.data.fin = true;
					$scope.data.ida = false;
				/*$scope.data.retorno = true;
				if(envio.estado_viaje_retorno) {
					$scope.data.choice = 'retorno';
					$scope.data.fin = false;
					$scope.data.ida = true;
					$scope.data.retorno = true;
				} else */if (envio.estado_viaje_ida) {
						$scope.data.choice = 'ida';
						$scope.data.fin = false;
						$scope.data.ida = true;
						// $scope.data.retorno = false;
					}
				} else
					$state.go('app.envios');
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});

		$scope.cancelar = function () {
			$state.go('app.envios');
		}
		$scope.guardar = function () {
			console.log($scope.data.choice);
			var mensaje = '';
			if ($scope.data.choice == 'finalizar') {
				var confirmPopup = $ionicPopup.confirm({
					title: 'Confirmar finalización',
					template: 'Desea dar por finalizado el viaje',
					cancelText: 'Cancelar',
					okText: 'Aceptar'
				});
				confirmPopup.then(function (res) {
					if (res) {
						$ionicLoading.show();
						console.log('You are sure');
						var request = $http({
							method: "get",
							url: GN7_API_URL + 'envio/finalizar/' + envio.idenvio,
							/*data: {
								estado_viaje_finalizado:true,
								fecha_viaje_finalizado:today,
								estado:"FINALIZADO"
							}*/
						});
						request.success(function (data) {
							if (data.status) {
								BackgroundGeolocationService.deleteIdEnvioForTracking();
								$cordovaNativeStorage.remove('aceptado').then(function (value) {
									$localstorage.removeItem('bgenvio');
									$state.go('app.tests');
								}, function (error) { });
							} else {
								$ionicPopup.alert({
									template: "No se pudo finalizar el viaje"
								});
							}
							$ionicLoading.hide();
						}).error(function (err) {
							$ionicPopup.alert({
								template: err.msg
							});
							$ionicLoading.hide();
						});
					} else {
						console.log('You are not sure');
					}
				});

			} else {
				if ($scope.data.choice == 'ida') {
					if (envio.estado_viaje_ida)
						mensaje = 'No se puede iniciar el viaje de ida 2 veces';
					if (envio.estado_viaje_retorno)
						mensaje = 'No se puede volver a iniciar el viaje';
				}
				if ($scope.data.choice == 'retorno') {
					if (!envio.estado_viaje_ida)
						mensaje = 'Debe iniciar el viaje de ida';
					if (envio.estado_viaje_retorno)
						mensaje = 'No se puede iniciar el viaje de retorno 2 veces';
				}
				if (mensaje != '') {
					$ionicPopup.alert({
						template: mensaje
					});
				} else {
					$ionicLoading.show();
					var datos = {};
					if ($scope.data.choice == 'ida')
					/*datos = {
						estado:'CURSO',
						estado_viaje_ida:true,
						fecha_viaje_ida:today
					};*/ {
						var request = $http({
							method: "get",
							url: GN7_API_URL + 'envio/iniciar/' + envio.idenvio
						});
					}
					if ($scope.data.choice == 'retorno') {
						datos = {
							estado_viaje_retorno: true,
							fecha_viaje_retorno: today
						};
						var request = $http({
							method: "put",
							url: GN7_API_URL + 'envio/' + envio.idenvio,
							data: datos
						});
					}
					request.success(function (data) {
						if (data.status) {
							$ionicLoading.hide();
							/*$ionicPopup.alert({
								 template: "Viaje de "+$scope.data.choice+" iniciado"
							 });*/
							$state.go('app.envios');
						} else {
							$ionicPopup.alert({
								template: "No se pudo iniciar el viaje"
							});
						}
						$ionicLoading.hide();
					}).error(function (err) {
						$ionicPopup.alert({
							template: err.msg
						});
						$ionicLoading.hide();
					});
				}
			}
		}
	})
	.controller('IncidenteCtrl', function ($ionicPopup, $localstorage, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth() + 1; //January is 0!
		var yyyy = today.getFullYear();
		var seconds = today.getSeconds();
		var minutes = today.getMinutes();
		var hour = today.getHours();
		if (dd < 10) {
			dd = '0' + dd
		}
		if (mm < 10) {
			mm = '0' + mm
		}
		if (hour < 10) {
			hour = '0' + hour
		}
		if (minutes < 10) {
			minutes = '0' + minutes
		}
		if (seconds < 10) {
			seconds = '0' + seconds
		}
		var fecha = yyyy + '-' + mm + '-' + dd + ' ' + hour + ':' + minutes + ':' + seconds;
		var envio = {};

		$cordovaNativeStorage.getItem('user').then(function (user) {
			$ionicLoading.show({
				template: 'Cargando...',
			});

			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				if (data.data.data !== null) {
					envio = data.data.data;
					$scope.incidente = {
						incidentes: true,
						fecha_incidente: fecha,
						titulo_incidentes: envio.titulo_incidentes,
						descripcion_incidentes: envio.descripcion_incidentes
					};
				} else
					$state.go('app.envios');

				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});

		$scope.carga = function () {
			$ionicLoading.show({ template: 'Guardando...' });
			var request = $http({
				method: "put",
				url: GN7_API_URL + 'envio/' + envio.idenvio,
				data: $scope.incidente
			});
			request.success(function (data) {
				console.log($scope.incidente);
				$ionicLoading.hide();
				if (data.status) {
					$state.go('app.envios');
				} else {
					$ionicPopup.alert({
						template: "No se pudo guardar la incidente"
					});
				}
			}).error(function (err) {
				$ionicPopup.alert({
					template: err.msg
				});
				$ionicLoading.hide();
			});
		}
		$scope.descarga = function () {
			$state.go('app.envios');
		}
	})
	.controller('ProductoCtrl', function ($stateParams, $ionicPopup, $localstorage, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$scope.user = user;
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});

		$scope.producto = $localstorage.getObject('producto');
		var id = $scope.producto.idpedido_detalle_producto;
		var idp = $stateParams.id;
		$scope.idp = $stateParams.id;
		$ionicLoading.show({
			//template: 'Cargando Envío...',
		});
		$http.get(GN7_API_URL + 'estado_producto').then(function (data) {
			$scope.opciones = data.data.data.rows;
			$ionicLoading.hide();
		}).catch(function (e) {
			$ionicLoading.hide();
			$ionicPopup.alert({
				template: JSON.stringify(e)
			});
		});

		$scope.form = {};
		$scope.guardar = function () {
			$ionicLoading.show({
				//template: 'Cargando Envío...',
			});
			var request = $http({
				method: "put",
				url: GN7_API_URL + 'pedido_detalle_producto/' + id,
				data: { idestado_producto: $scope.producto.idestado_producto }
			});
			request.then(function (data) {
				if (data.data.status) {
					$state.go('app.productos', { id: idp });
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: "Estado de Producto Guardado"
					});
				} else
					$ionicPopup.alert({
						template: "No se pudo guardar"
					});

				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}
		$scope.cancelar = function () {
			$state.go('app.productos', { id: idp });
		}
	})
	.controller('ProductosCtrl', function ($ionicPopup, $cordovaBarcodeScanner, $cordovaCamera, $localstorage, $stateParams, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		var idofertaenvio = $localstorage.get('idofertaenvio');
		var id = $stateParams.id;
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$scope.data = {};
			$ionicLoading.show({
				template: 'Cargando...',
			});
			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				var envio = {};
				if (data.data.data !== null) {
					envio = data.data.data;
					$scope.productos = envio.pedido_detalles[id].pedido_detalle_productos;
					$scope.data.aceptado = true;
				} else {
					var request = $http({
						method: "get",
						url: GN7_API_URL + 'oferta/obtenerofertas/' + user.usuario.idconductor
					});
					request.then(function (data) {
						if (data.data.data.rows.length > 0) {
							envio = data.data.data.rows[idofertaenvio].ofertaenvio;
							$scope.productos = envio.pedido_detalles[id].pedido_detalle_productos;
							$scope.data.aceptado = false;
						}
						$ionicLoading.hide();
					}).catch(function (e) {
						$ionicLoading.hide();
						$ionicPopup.alert({
							template: JSON.stringify(e)
						});
					});
				}
				//else
				//$state.go('app.vacio');
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});
		$scope.estado = function (key) {
			$localstorage.setObject('producto', $scope.productos[key]);
			$state.go('app.producto', { id: id });
		}
		$scope.faltantes = function (key) {
			$localstorage.setObject('producto', $scope.productos[key]);
			$state.go('app.faltantes', { id: id });
		}
		$scope.rechazados = function (key) {
			$localstorage.setObject('producto', $scope.productos[key]);
			$state.go('app.rechazados', { id: id });
		}
	})
	.controller('EstadoCtrl', function ($ionicPopup, $stateParams, BackgroundGeolocationService, $cordovaGeolocation, $ionicLoading, GN7_API_URL, $http, $state, $cordovaNativeStorage, $scope) {
		var id = $stateParams.id;
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$ionicLoading.show({
				template: 'Cargando...',
			});

			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				var envio = {};
				var carga = {};
				if (data.data.data !== null) {
					envio = data.data.data.pedido_detalles[id];
					console.log(envio);
					//if(envio.pedido_detalle_estado_pedido_detalles[0].estado_pedido_detalle===null)
					if (envio.pedido_detalle_estado_pedido_detalles[0] == undefined) {
						$scope.boton = true;
					} else {
						$http.get(GN7_API_URL + 'estado_pedido_detalle/PUNTO DE CARGA/' + envio.idpedido).then(function (data) {
							$ionicLoading.hide();
							$scope.opciones = data.data.data;
							carga = $scope.opciones[$scope.opciones.length - 1];
							if (envio.pedido_detalle_estado_pedido_detalles[0].estado_pedido_detalle.idestado_pedido_detalle >= carga.idestado_pedido_detalle)
								$scope.boton = false;
							else
								$scope.boton = true;
						}).catch(function (e) {
							$ionicLoading.hide();
							$ionicPopup.alert({
								template: JSON.stringify(e)
							});
						});
					}
				}
				else
					$state.go('app.envios');
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});

		$scope.carga = function () {
			$state.go('app.carga', { id: id });
		};
		$scope.descarga = function () {
			$state.go('app.descarga', { id: id });
		};
	})
	.controller('SolicitudCtrl', function (GeoService, $cordovaLaunchNavigator, $localstorage, $rootScope, $interval, $cordovaNativeStorage, $ionicPopup, GN7_API_URL, $http, $ionicLoading, $scope, $state) {
		$cordovaNativeStorage.getItem('aceptado').then(function (aceptado) {
			$state.go('app.envios');
		}, function (error) {
		});

		$cordovaNativeStorage.getItem('user').then(function (user) {
			$scope.user = user;
			$ionicLoading.show({
				template: 'Buscando Pedido...',
			});

			$http.get(GN7_API_URL + 'oferta/obtenerofertas/' + user.usuario.idconductor).then(function (data) {
				$scope.envios = data.data.data.rows;
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});

		$scope.incidente = function (idofertaenvio) {
			$localstorage.set('idofertaenvio', idofertaenvio);
			$state.go('app.envios');
		}
		$scope.buscar = function () {
			$ionicLoading.show({
				template: 'Buscando Pedido...',
			});
			$http.get(GN7_API_URL + 'oferta/obtenerofertas/' + $scope.user.usuario.idconductor).then(function (data) {
				$scope.envios = data.data.data.rows;
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}
	})
	.controller('MapCtrl', function (GN7_API_URL, $http, $scope, $stateParams, $cordovaNativeStorage, $ionicLoading, $ionicPopup) {
		var id = $stateParams.id;
		$cordovaNativeStorage.getItem('user').then(function (user) {
			$ionicLoading.show({
				template: 'Buscando Pedido...',
			});
			$http.get(GN7_API_URL + 'conductor/envioasignado/' + user.usuario.idconductor).then(function (data) {
				var envio = {};
				if (data.data.data !== null) {
					envio = data.data.data;
					var pedido = envio.pedido_detalles[id];
					var directionsDisplay = new google.maps.DirectionsRenderer();
					var chicago = new google.maps.LatLng(pedido.carga.punto_latitud, pedido.carga.punto_longitud);
					var mapOptions = {
						zoom: 7,
						center: chicago
					}
					var map = new google.maps.Map(document.getElementById("map"), mapOptions);
					directionsDisplay.setMap(map);
					var directionsService = new google.maps.DirectionsService();
					var start = new google.maps.LatLng(pedido.punto_latitud_carga, pedido.punto_longitud_carga);
					var end = new google.maps.LatLng(pedido.punto_latitud_descarga, pedido.punto_longitud_descarga);
					var request = {
						origin: start,
						destination: end,
						travelMode: google.maps.TravelMode.DRIVING
					};
					directionsService.route(request, function (result, status) {
						if (status == google.maps.DirectionsStatus.OK) {
							directionsDisplay.setDirections(result);
						}
					});
					$scope.map = map;
				}
				else {
					$state.go('app.tests');
				}
				$ionicLoading.hide();
			}).catch(function (e) {
				$ionicLoading.hide();
				$ionicPopup.alert({
					template: JSON.stringify(e)
				});
			});
		}, function (error) {
			$cordovaNativeStorage.getItem('terminos').then(function (user) {
				$state.go('auth.login');
			}, function (error) {
				$state.go('auth.walkthrough');
			});
		});
	})
	//LOGIN
	.controller('FirmaCtrl', function ($http, GN7_API_URL, $ionicLoading, $scope, $ionicPopup, $stateParams, $localstorage, $state) {
		var idpedido = $stateParams.idpedido;
		$scope.id = $stateParams.id;
		$scope.data = { nombre: '' };
		/*var wrapper = document.getElementById("signature-pad"),
			canvas = wrapper.querySelector("canvas"),
			signaturePad;
		function resizeCanvas() {
			var ratio =  Math.max(window.devicePixelRatio || 1, 1);
			canvas.width = canvas.offsetWidth * ratio;
			canvas.height = canvas.offsetHeight * ratio;
			canvas.getContext("2d").scale(ratio, ratio);
		}
	
		window.onresize = resizeCanvas;
		resizeCanvas();
	
		signaturePad = new SignaturePad(canvas);*/
		var canvas = document.querySelector("canvas");
		var signaturePad = new SignaturePad(canvas);
		$scope.clear = function () {
			signaturePad.clear();
		}
		$scope.save = function () {
			if (signaturePad.isEmpty()) {
				$ionicPopup.alert({
					template: 'Por favor ponga su firma.'
				});
			} else {
				$ionicLoading.show({
					template: 'Guardando...',
				});
				var datos = {
					imagen: signaturePad.toDataURL(),
					data: { descripcion: $scope.data.nombre }
				}
				console.log(datos);
				var request = $http({
					method: "post",
					url: GN7_API_URL + 'pedido_detalle/addimagen/FIRMA_DIGITAL/' + idpedido,
					data: datos
				});
				request.then(function (data) {
					if (data.data.status) {
						console.log(data);
						$ionicPopup.alert({
							template: "Firma guardada"
						});
						$state.go('app.test', { id: $scope.id });
					}
					else
						$ionicPopup.alert({
							template: "No se pudo guardar"
						});
					$ionicLoading.hide();
				}).catch(function (e) {
					$ionicLoading.hide();
					$ionicPopup.alert({
						template: JSON.stringify(e)
					});
				});
				/*$scope.imgURI = signaturePad.toDataURL();
				$ionicPopup.alert({
				  template: 'Firma guardada'
				});*/
			}
		}
	})
	;
