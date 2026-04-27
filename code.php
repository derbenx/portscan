<div id="app-content">
<div id='tab'>
<table><tr>
<td>Base IP</td><td>Start IP</td><td>End IP</td><td>first port</td><td>last port</td><td>timeout</td>
</tr><tr>
 <td><input class='z' id='ip' maxlength='11' value='<?php

//echo getHostByName(getHostName());
$ip= $_SERVER['SERVER_ADDR'];
$ip=explode(".", $ip);
echo $ip[0].".".$ip[1].".".$ip[2];

?>'</td>
 <td><input class='z' id='st' maxlength='3' value='1'></td>
 <td><input class='z' id='ed' maxlength='3' value='254'></td>
 <td><input class='z' id='sp' maxlength='5' value='80'></td>
 <td><input class='z' id='ep' maxlength='5' value='65534'></td>
 <td><input class='z' id='to' maxlength='4'value='0.2'></td>
</tr></table>
 <button id='pgsw'>Ping Sweep</button>
 <button id='prsw'>Port Sweep</button>
 <button id='prsc'>Port Scan</button>
 <button id='stsc'>Stop Scan</button>
 <label id='lb' for='cb'>scroll to:<input id='cb' type='checkbox'></label>
<font id='ver'>(Ver 1.x)</font>
</div><p>
<div id="pr"></div>
<?php
/*
$pt=(isset($_REQUEST['pt']) && $_REQUEST['pt']) ? $_REQUEST['pt'] : 'p';
$ip=(isset($_REQUEST['ip']) && $_REQUEST['ip'])  ? $_REQUEST['ip'] : '192.168.15';
$ip.='.';

echo "<script>";
$list='';
echo "fsp=[$list];".PHP_EOL;
echo "</script>";
*/
?>
</div>