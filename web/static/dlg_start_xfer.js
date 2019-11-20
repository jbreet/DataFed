function dlgStartTransfer( a_mode, a_ids, a_cb ) {
    var frame = $(document.createElement('div'));
    var ep_lab = a_mode == XFR_GET?"Destination":"Source";
    var rec_lab = a_mode == XFR_GET?"Source":"Destination";
    var rec_tree;

    frame.html( "<div class='ui-widget' style='height:95%'>" +
        rec_lab + ": <span id='title'></span><br>\
        <div class='col-flex' style='height:100%'>\
        <div id='records' class='ui-widget ui-widget-content' style='flex: 1 1 auto;display:none;height:6em;overflow:auto'></div>\
        <div style='flex:none'><br>" + ep_lab + " Endpoint:<br>\
        <select id='matches' disabled><option disabled selected>No Matches</option></select><br>\
        <div style='padding:.25em 2em'>\
        <button class='btn small' id='refresh'>Refresh</button>&nbsp<button class='btn small' id='activate' disabled>(re)Activate</button>&nbsp<button class='btn small' id='browse' style='margin:0' disabled>Browse</button></div><br>" +
        ep_lab + " Path:<br>\
        <textarea class='ui-widget-content' id='path' rows=3 style='width:100%;resize:none'></textarea><br>" +
        (a_mode == XFR_PUT?"File extension override: <input id='ext' type='text'></input><br>":"") +
        "</div></div></div>");

    var label = ["Get (Download)","Put (Upload)","Select"];
    var dlg_title = label[a_mode] + " Data";
    var selection_ok = true;
    var endpoint_ok = false;

    //console.log("records:",a_ids);

    function updateGoBtn(){
        if ( selection_ok && endpoint_ok )
            $("#go_btn").button("enable");
        else
            $("#go_btn").button("disable");
    }

    if ( !a_ids ){
        $("#title",frame).html( "(new record)" );
    }else if ( a_ids.length > 1 ){
        var item, skip = 0, tot_sz = 0;
        var info, sel, src = [];
        for ( var i in a_ids ){
            item = a_ids[i];
            if ( item.size == 0 ){
                info = "(empty)";
                sel = false;
            }else if ( item.locked ){
                info == "(locked)"
                sel = false;
            }else{
                tot_sz += parseInt( item.size );
                info = sizeToString( item.size );
                sel = true;
            }

            if ( sel ){
                src.push({ title: item.id + "&nbsp&nbsp&nbsp<span style='display:inline-block;width:9ch'>" + info + "</span>&nbsp" + item.title, selected: true, key: item.id });
            }else{
                skip += 1;
                src.push({ title: "<span style='color:#808080'>" + item.id + "&nbsp&nbsp&nbsp<span style='display:inline-block;width:9ch'>" + info + "</span>&nbsp" + item.title + "</span>", unselectable: true, key: item.id });
            }
        }
        $("#title",frame).text( "" + a_ids.length + " records, " + skip + " skipped, total size: " + sizeToString( tot_sz ));

        $($("#records",frame),frame).fancytree({
            extensions: ["themeroller"],
            themeroller: {
                activeClass: "my-fancytree-active",
                addClass: "",
                focusClass: "",
                hoverClass: "my-fancytree-hover",
                selectedClass: ""
            },
            source: src,
            checkbox: true,
            selectMode: 3,
            icon:false,
            select:function( ev, data ){
                var sel = rec_tree.getSelectedNodes();
                if ( sel.length ){
                    if ( !selection_ok ){
                        selection_ok = true;
                        updateGoBtn();
                    }
                }else{
                    if ( selection_ok ){
                        selection_ok = false;
                        updateGoBtn();
                    }
                }
            }
        });

        $("#records",frame).show();
        rec_tree = $("#records",frame).fancytree("getTree");
    }else{
        item = a_ids[0];
        html = item.id + "&nbsp&nbsp" + sizeToString( item.size ) + "&nbsp&nbsp" + item.title;
        $("#title",frame).html( html );
    }

    var matches = $("#matches",frame);
    var path_in = $("#path",frame);
    var ep_list = null;
    var cur_ep = null;

    inputTheme(path_in);
    inputTheme($("#ext",frame));

    matches.on('selectmenuchange', function( ev, ui ) {
        if ( ep_list && ui.item ){
            cur_ep = ep_list[ui.item.index-1];

            path_in.val( cur_ep.name + (cur_ep.default_directory?cur_ep.default_directory:"/"));
            if ( cur_ep.activated || cur_ep.expires_in == -1 ){
                $("#browse",frame).button("enable");
                endpoint_ok = true;
                updateGoBtn();
            }else{
                $("#browse",frame).button("disable");
                endpoint_ok = false;
                updateGoBtn();
            }

            if ( cur_ep.expires_in == -1 )
                $("#activate",frame).button("disable");
            else
                $("#activate",frame).button("enable");
        }
    });

    $(".btn",frame).button();

    $("#refresh",frame).on('click', function(){
        clearTimeout( in_timer );
        $("#browse",frame).button("disable");
        $("#activate",frame).button("disable");
        cur_ep = null;
        in_timer = setTimeout( inTimerExpired, 250 );
    });

    $("#browse",frame).on('click',function(){
        //console.log("browse ep:",path_in.val());
        var path = path_in.val();
        var delim = path.indexOf("/");
        if ( delim != -1 ){
            path = path.substr(delim);
            if ( path.charAt( path.length -1 ) != "/" ){
                delim = path.lastIndexOf("/");
                if ( delim > 0 )
                    path = path.substr(0,delim+1);
                else
                    path += "/";
            }
        }else
            path = cur_ep.default_directory?cur_ep.default_directory:"/";
        //console.log("path:",path);
        dlgEpBrowse( cur_ep, path, (a_mode == XFR_GET)?"dir":"file", function( sel ){
            path_in.val( cur_ep.name + sel );
        });
    });

    $("#activate",frame).on('click',function(){
        //console.log("activate ep:",path_in.val());
        //https://app.globus.org/file-manager?origin_id=57805a92-43f9-11e8-8e06-0a6d4e044368
        //window.open('https://www.globus.org/app/endpoints/'+ encodeURIComponent(cur_ep.id) +'/activate','');
        window.open('https://app.globus.org/file-manager?origin_id='+ encodeURIComponent(cur_ep.id),'');
    });

    var in_timer;
    function inTimerExpired(){
        var ep = path_in.val().trim();

        if ( ep.length == 0 ){
            ep_list = null;
            matches.html( "<option disabled selected>No Matches</option>" );
            matches.selectmenu("refresh");
            matches.selectmenu("disable");
            return;
        }

        var delim = ep.indexOf("/");
        if ( delim != -1 )
            ep = ep.substr(0,delim);


        if ( !cur_ep || ep != cur_ep.name ){
            $("#browse",frame).button("disable");
            $("#activate",frame).button("disable");

            epView( ep, function( ok, data ){
                if ( ok && !data.code ){
                    //console.log( "OK", data );
                    cur_ep = data;
                    cur_ep.name = cur_ep.canonical_name || cur_ep.id;

                    var html = "<option title='" + (cur_ep.description?cur_ep.description:"(no info)") + "'>" + (cur_ep.display_name || cur_ep.name) + " (";

                    if ( cur_ep.activated )
                        html += Math.floor( cur_ep.expires_in/3600 ) + " hrs";
                    else if ( cur_ep.expires_in == -1 )
                        html += "active";
                    else
                        html += "inactive";
                        
                    html += ")</option>";

                    matches.html( html );
                    matches.selectmenu("refresh");
                    matches.selectmenu("enable");

                    if ( cur_ep.activated || cur_ep.expires_in == -1 ){
                        $("#browse",frame).button("enable");
                        endpoint_ok = true;
                        updateGoBtn();
                    }

                    if ( cur_ep.expires_in != -1 )
                        $("#activate",frame).button("enable");

                }else{
                    cur_ep = null;
                    epAutocomplete( ep, function( ok, data ){
                        //console.log("ep matches:", ok, data );
                        if ( ok ){
                            if ( data.DATA && data.DATA.length ){
                                ep_list = data.DATA;
                                var ep;
                                var html = "<option disabled selected>" + data.DATA.length + " match" + (data.DATA.length>1?"es":"") + "</option>";
                                for ( var i in data.DATA ){
                                    ep = data.DATA[i];
                                    ep.name = ep.canonical_name || ep.id;
                                    html += "<option title='" + ep.description + "'>" + (ep.display_name || ep.name) + " (";
                                    if ( !ep.activated && ep.expires_in == -1 )
                                        html += "active)</option>";
                                    else
                                        html += (ep.activated?Math.floor( ep.expires_in/3600 ) + " hrs":"inactive") + ")</option>";
                                }
                                matches.html( html );
                                matches.selectmenu("refresh");
                                matches.selectmenu("enable");
                            }else{
                                ep_list = null;
                                matches.html( "<option disabled selected>No Matches</option>" );
                                matches.selectmenu("refresh");
                                matches.selectmenu("disable");

                                if ( data.code ){
                                    dlgAlert( "Globus Error", data.code );
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    var options = {
        title: dlg_title,
        modal: true,
        width: '600',
        height: 'auto',
        resizable: true,
        closeOnEscape: false,
        buttons: [{
            id: "go_btn",
            text: label[a_mode],
            click: function() {
                var raw_path = $("#path",frame).val().trim();
                if ( !raw_path ) {
                    dlgAlert("Input Error","Path cannot be empty.");
                    return;
                }
                var inst = $(this);
                if ( a_mode != XFR_SELECT ){
                    var ext = $("#ext",frame).val();
                    if ( ext )
                        ext.trim();

                    var ids = [];
                    if ( a_ids.length == 1 )
                        ids = [a_ids[0].id];
                    else{
                        var sel = rec_tree.getSelectedNodes();
                        for ( var i in sel ){
                            ids.push( sel[i].key );
                        }
                    }
                    console.log("ids:", ids );
                    xfrStart( ids, a_mode, raw_path, ext, function( ok, data ){
                        if ( ok ){
                            clearTimeout( in_timer );
                            inst.dialog('destroy').remove();
                            dlgAlert( "Transfer Initiated", "Data transfer ID and progress will be shown under the 'Transfers' tab on the main window." );
                        }else{
                            dlgAlert( "Transfer Error", data );
                        }
                    });
                }else{
                    a_cb( raw_path );
                    clearTimeout( in_timer );
                    $(this).dialog('destroy').remove();
                }
            }
        },{
            text: "Cancel",
            click: function() {
                clearTimeout( in_timer );
                $(this).dialog('destroy').remove();
            }
        }],
        open: function(){
            updateGoBtn();

            if ( g_ep_recent.length ){
                path_in.val( g_ep_recent[0] );
                path_in.select();
                path_in.autocomplete({
                    source: g_ep_recent,
                    select: function(){
                        clearTimeout( in_timer );
                        in_timer = setTimeout( inTimerExpired, 250 );
                    }
                });
                inTimerExpired();
            }
            //matches.selectmenu({width:"90%"});
            matches.selectmenu({width: 400});

            path_in.on('input', function(){
                if ( cur_ep && !path_in.val().startsWith( cur_ep.name )){
                    endpoint_ok = false;
                    updateGoBtn();
                }

                clearTimeout( in_timer );
                in_timer = setTimeout( inTimerExpired, 750 );
            });
        }
    };

    frame.dialog( options );
}

