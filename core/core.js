var server_adress = "http://188.19.14.118:49003";  				//server name
var rest_request_item = "/rest/items?type=json";				//openhab rest item request
var rest_request_sitemap = "/rest/sitemaps/Main_SM?type=json";	//openhab rest sitemap theme request

var requestTime = 2500; 										//json request timer in ms
var logEnabled = false;											//enable console.log
var clickDisableTime = 2000;									//Время отключения обработки кликов в мс

var loopTimer = setTimeout( Item_Get , requestTime );	//loop timer for item json request

//OpenHAB object
function OH_Item( name , image , stateOff , stateOn , textOff , textOn ) {
	this.name = name;			//Имя инициализорованное в JS
	this.ohName = "";			//Имя на сервере OpenHab
	this.type = "";				//Тип переменной
	this.state = "";			//Состояние объекта
	this.stateNew = "";			//Новое состояние для отправки на сервер OpenHab
	this.stateLast = "";		//Последнее состояние, необходимое для обновления в интерфейсе
	this.stateOff = stateOff;	//Какую строку принять за состояние FALSE,0
	this.stateOn = stateOn;		//Какую строку принять за состояние TRUE,1
	this.textOff = textOff;		//Для интерфейса, текст при состоянии FALSE
	this.textOn = textOn;		//Для интерфейса, текст при состоянии TRUE
	this.elementID = name;		//html id для анимации действий
	this.link = "";				//url для отправки команд и состояний, считывается в запросе
	this.image = image;			//Имя изображения хранящееся на сервере OpenHab
	this.currImageURL = "";		//Текущее изображение в анимации
	this.clickDisabled = false;	//Отключаем действия с кнопкой на 2 сек при отправке команды на сервер
	this.updateImage = true;	//Бит для обновления изображения
	this.sayHi = function() {
	alert("Моё имя: " + this.name);
	};
	
	//Переключение состояния битовой переменной
	this.SwitchState = function() {
		if ( this.state == this.stateOn ) {
			this.stateNew = this.stateOff;
		}
		else {
			this.stateNew = this.stateOn;
		}
		Console_Log( "log","Item "+this.name+" is switched to " + this.stateNew, true );
		Item_SendCommand( this );
	};
}

//Инициализация переменных OpenHab

var FF_ShowRoom_Door = new OH_Item("FF_ShowRoom_Door","switch","OFF","ON","ОТКРЫТ","ЗАКРЫТ");
//var Weather_Chart_Period = new OH_Item("Weather_Chart_Period","switch","OFF","ON","ОТКРЫТ","ЗАКРЫТ");


//Console Log function
function Console_Log( logType , message , express ) {
	
	if ( logEnabled || (express == true)) {
		switch ( logType ) {
			case "error":
				console.error( message );
				break;
			case "log":
				console.log( message );
				break;
			case "warning":
				console.warn( message );
				break;				
		}
	}
}


function Item_Search ( jsonObj ) {
	try {
		switch ( jsonObj.name ) {
		
			case FF_ShowRoom_Door.name:
				Item_Update( jsonObj , FF_ShowRoom_Door );
				break;
				
			case Weather_Chart_Period.name:
				Item_Update( jsonObj , Weather_Chart_Period );
				break;
				
		}
	}
	catch (e) {
		Console_Log("error","Search Item " + jsonObj.name + " fail");
	}
}

function Item_Update ( jsonObj , jsObj ) {
	try {
		Console_Log("log","Item "+jsObj.name+" updated");
		jsObj.ohName = jsonObj.name;
		jsObj.type = jsonObj.type;
		jsObj.state = jsonObj.state;
		jsObj.link = jsonObj.link;
		
		if (jsObj.type == "SwitchItem")
		{
			if (jsObj.stateLast != jsObj.state) 
			{
				jsObj.udateImage = true;
				Console_Log("log","Item " + jsObj.ohName + " changed to " + jsObj.state + " (" + jsObj.stateOff + "-" + jsObj.textOff + ", " + jsObj.stateOn + "-" + jsObj.textOn + ")", true);
			}
			
			if (jsObj.udateImage) {
				if (jsObj.state == jsObj.stateOff)
				{
					jsObj.currImageURL = server_adress + "/images/" + jsObj.image + "-off.png";
					$("#"+jsObj.elementID+" span").text(jsObj.textOff);
					$("#flip-1").val('off').slider('refresh');
				}
				else if (jsObj.state == jsObj.stateOn)
				{
					jsObj.currImageURL = server_adress + "/images/" + jsObj.image + "-on.png";
					$("#"+jsObj.elementID+" span").text(jsObj.textOn);
					$("#flip-1").val('on').slider('refresh');
				}
				else 
				{
					jsObj.currImageURL = server_adress + "/images/" + jsObj.image + ".png";
					$("#"+jsObj.elementID+" span").text(jsObj.textOff);
				}
				
				$("#"+jsObj.elementID+"_Image").attr("src",jsObj.currImageURL + "?"); // + new Date().getTime()
				jsObj.udateImage = false;
			}
		}
		
		jsObj.stateLast = jsObj.state;
		//attr("src", "/myimg.jpg?"+d.getTime());
	}
	catch(e){
		Console_Log("error","Update Item " + jsonObj.name + " fail");
	}
}

//function Console_Log()

function Item_Get ()
{
	Console_Log ( "log" , "Item JSON request - start" );
	$.getJSON ( server_adress+rest_request_item , function( data ) {
	  $.each ( data , function (index , value) {
		try {
			$.each ( value , function ( index2 , value2 ) {
				jsonObj = jQuery.parseJSON(JSON.stringify(value2));
				Item_Search(jsonObj);
			});
		}
		catch(e){
			Console_Log("error","Item JSON decode fail");//это для наглядности дебага
		}
		});
	})
	.success	(function() 	{ Console_Log("log","Item JSON request - successful"); 	})
	.error		(function()		{ Console_Log("error","Item JSON request - error"); 		})
	.complete	(function() 	{ Console_Log("log","Item JSON request - complete"); 		});
	
	loopTimer = setTimeout ( Item_Get , requestTime ) ;
}

function  Request_Abort ()
{
	clearTimeout(item_timer);
}

function Item_SetState ( ItemObj )
{
    var request = $.ajax
    ({
        type       : "PUT",
        url        : ItemObj.link + "/state",
        data       : ItemObj.stateNew, 
        headers    : { "Content-Type": "text/plain" }
    });
    request.done( function(data) { Console_Log("log", "Success: send command " + ItemObj.stateNew + " to " + ItemObj.name ) ;});
    request.fail( function(jqXHR, textStatus ) { Console_Log("error","Failure: send command " + ItemObj.stateNew + " to " + ItemObj.name + " / " + textStatus ) ;});
}

function Item_SendCommand ( ItemObj )
{
    var request = $.ajax
    ({
		type       : "POST",
		url        : ItemObj.link,
		data       : ItemObj.stateNew,
		headers    : { 'Content-Type': 'text/plain' }
    });
    request.done( function(data) { Console_Log ( "log", "Success: send command " + ItemObj.stateNew + " to " + ItemObj.name ); });
    request.fail( function(jqXHR, Status ) { Console_Log ( "error", "Failure: send command " + ItemObj.stateNew + " to " + ItemObj.name + " / " + Status ) ;});
}

$( "#FF_ShowRoom_Door_Image" ).click( function() {
	if (FF_ShowRoom_Door.clickDisabled)
		return;
	FF_ShowRoom_Door.SwitchState();
	FF_ShowRoom_Door.clickDisabled = true;
	setTimeout(function(){FF_ShowRoom_Door.clickDisabled = false;}, clickDisableTime);
});

$( "#FF_ShowRoom_Door2" ).click( function() {
	if (FF_ShowRoom_Door.clickDisabled)
		return;
	FF_ShowRoom_Door.SwitchState();
	FF_ShowRoom_Door.clickDisabled = true;
	setTimeout(function(){FF_ShowRoom_Door.clickDisabled = false;}, clickDisableTime);
});

$( "#flip-checkbox-3" ).change( function() {
	if (FF_ShowRoom_Door.clickDisabled)
		return;
	FF_ShowRoom_Door.SwitchState();
	FF_ShowRoom_Door.clickDisabled = true;
	$( "#flip-checkbox-3" ).flipswitch( "disable" );
	setTimeout(function(){FF_ShowRoom_Door.clickDisabled = false; $( "#flip-checkbox-3" ).flipswitch( "enable" );}, clickDisableTime);
});

$( "#flip-1" ).change( function() {
	if (FF_ShowRoom_Door.clickDisabled)
		return;
	FF_ShowRoom_Door.SwitchState();
	FF_ShowRoom_Door.clickDisabled = true;
	//$( "#flip-1" ).slider( "disable" );
	setTimeout(function(){FF_ShowRoom_Door.clickDisabled = false;}, clickDisableTime);
});
