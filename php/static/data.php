<?php
header('Access-Control-Allow-Origin: *');
define('HOST',getenv('OPENSHIFT_MYSQL_DB_HOST'));
define('PORT',getenv('OPENSHIFT_MYSQL_DB_PORT'));
include("flip.php");
class ImgResizer {
    private $originalFile = '';
    public function __construct($originalFile = '') {
        $this->originalFile = $originalFile;
    }
    public function resize($newWidth, $targetFile) {
    	$type = 2;
    	$ext = explode(".",$targetFile); $ext = strtolower($ext[count($ext)-1]);
		switch($ext) {
			case "gif":$type = 1;break;
			case "jpg":$type = 2;break;
			case "png":$type = 3;break;
		}
        if (empty($newWidth) || empty($targetFile)) {
            return false;
        }
        if($type == 3) {
        	$src = imagecreatefrompng($this->originalFile);
        } elseif($type == 1) {
        	$src = imagecreatefromgif($this->originalFile);
        } else {
        	$src = imagecreatefromjpeg($this->originalFile);
        }
        list($width, $height) = getimagesize($this->originalFile);
        $newHeight = ($height / $width) * $newWidth;
        $tmp = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($tmp, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        if (file_exists($targetFile)) {
            unlink($targetFile);
        }
        if($type == 3) {
        	imagepng($tmp,$targetFile,8);
        } elseif($type == 1) {
        	imagegif($tmp,$targetFile,90);
        } else {
        	imagejpeg($tmp, $targetFile, 90);
    	}
    }
}
class Upload {
	private $completed,$error,$maxWidth=800,$file,$exif,$album,$name,$json = "No exif data found";
	private $imagePath,$thumbPath,$imageFolderPath = "images/",$thumbFolderPath = "thumbs/";
	public $id,$pdo,$root;
	public function __construct($pdo) {
		$this->root = getenv('OPENSHIFT_DATA_DIR')."data/";
		$this->pdo = $pdo;
	}
	public function iconize() {
		$size = getimagesize($this->imagePath);
		$width = $size[0] >= 191 ? 191 : $size[0];
		$img = new ImgResizer($this->imagePath);
		$img->resize($width,$this->thumbPath);
		$this->store();
	}
	public function flip() {
		if($data = json_decode(stripslashes($this->exif),true)) {	
			if(array_key_exists('Orientation',$data)) {
				if(fix_orientation($this->imagePath,$data,$this->imagePath)) {
					$this->json = json_encode($this->exif,JSON_FORCE_OBJECT);
					return true;
				} else {
					die("An error occurred adjusting an image's orientation.");
				}
			} else {
				return true;
			}
		} else {
			return true;
		}
	}
	public function load($file,$exf,$album) {
		$this->file = $file;
		$this->exif = $exf;
		$this->album = $album;
		$this->imagePath = $this->root.$this->imageFolderPath.$this->file["name"];
		$this->thumbPath = $this->root.$this->thumbFolderPath.$this->file["name"];
		if($this->move()) {
			if($this->flip()) {
				$size = getimagesize($this->imagePath);
				$this->album = $album;
				if($size[0] > $this->maxWidth) {
					$this->resize();
				} else {
					$this->iconize();
				}
			} else return false;
		} else return false;
	}
	public function move() {
		$this->name = $this->file["name"];
		if(file_exists($this->imagePath) || preg_match("/[^a-z0-9\ \-\_\+]/i",$this->name)) {
			$ext = explode(".",$this->name);
			$ext = $ext[count($ext)-1];
			$this->name = time().$this->id.".".$ext;
			$this->imagePath = $this->root.$this->imageFolderPath.$this->name;
			$this->thumbPath = $this->root.$this->thumbFolderPath.$this->name;
		}
		if(move_uploaded_file($this->file["tmp_name"],$this->imagePath)) {
			return true;
		} else {
			die("Unable to move file ".$this->file["name"]);
		}
	}
	public function resize() {
		$size = getimagesize($this->imagePath);
		$width = $size[0];
		$height = $size[1];
		$img = new ImgResizer($this->imagePath);
		$img->resize($this->maxWidth,$this->imagePath);
		$this->iconize();
	}
	public function store() {
		$time = time();
		$src = "data/".$this->imageFolderPath.$this->name;
		$thumb = "data/".$this->thumbFolderPath.$this->name;
		try {
			$this->pdo->query("INSERT INTO `all` (thumb,src,time,album,exif) VALUES ('$thumb','$src','$time','$this->album','$this->json')");
			$this->completed = true;
			return true;
		} catch(Exception $e) {
			die("error");
			$this->completed = false;
			$this->error = "Error:".$e->getMessage();
			return false;
		}
	}
}
class Get {
	public $pdo;
	public function __construct($pdo) {
		$this->pdo = $pdo;
	}
	public function data($data) {
		$name = $data["album"];
		$request = $data["request"];
		$anchor = $data["anchor"];
		$limit = $data["limit"];
		$where = empty($data["where"]) ? 1 : stripslashes($data["where"]);
		$query = "SELECT * FROM `$request` WHERE $where ORDER BY time DESC LIMIT $anchor,$limit";
		//
		$c_array = array();
		$comments = $this->pdo->query("SELECT * FROM `comments`");
		if($comments->rowCount() > 0) {
			foreach($comments as $get) {
				$id = $get["pictureId"];
				if(!isset($c_array[$id]["length"])) {
					$c_array[$id] = array();
					$c_array[$id]["length"] = 0;
				}
				$x = $c_array[$id]["length"];
				$c_array[$id][$x] = array();
				$c_array[$id][$x]["id"] = $get["id"];
				$c_array[$id][$x]["author"] = $get["author"];
				$c_array[$id][$x]["body"] = $get["body"];
				$c_array[$id]["length"]++;
			}
		}
		//
		try {
			$results = $this->pdo->query($query);
			$array = array();
			$i = 0;
			foreach($results as $get) {
				$array[$i] = array();
				$array[$i]["id"] = $get["id"];
				$array[$i]["thumb"] = $get["thumb"];
				$array[$i]["src"] = $get["src"];
				$array[$i]["time"] = $get["time"];
				$array[$i]["author"] = $get["author"];
				$array[$i]["comments"] = array();
				$id = $get["id"];
				if($c_array[$id]["length"] > 0) {
					for($e=0;$e<$c_array[$id]["length"];$e++) {
						$array[$i]["comments"][$e] = array();
						$array[$i]["comments"][$e]["id"] = $c_array[$id][$e]["id"];
						$array[$i]["comments"][$e]["author"] = $c_array[$id][$e]["author"];
						$array[$i]["comments"][$e]["body"] = $c_array[$id][$e]["body"];
					}
					$array[$i]["comments"]["length"] = $e;
				} else {
					$array[$i]["comments"]["length"] = 0;
				}
				$i++;
			}
			$total = $this->pdo->query("SELECT id FROM `$request` WHERE $where");
			if($name) {	
				$kind = $this->pdo->query("SELECT kind FROM `albums` WHERE name = '$name'");
				foreach($kind as $g) {
					$k = $g["kind"];
				}
				$array["kind"] = intval($k);
			}
			$array["length"] = $results->rowCount();
			$array["total"] = $total->rowCount();
			echo json_encode($array,JSON_FORCE_OBJECT);
		} catch(PDOException $e) {
			die($e->getMessage());
		}
	}
	public function boards($post) {
		try {
			$sql = $this->pdo->query("SELECT * FROM `albums` WHERE kind = '0' ORDER BY timestamp DESC LIMIT 6");
			$arr = array();
			$i = 0;
			foreach($sql as $get) {
				$arr[$i] = array();
				$arr[$i]["id"] = $get["id"];
				$arr[$i]["name"] = $get["name"];
				$i++;
			}
			$arr["length"] = $sql->rowCount();
			echo json_encode($arr,JSON_FORCE_OBJECT);
		} catch(PDOException $e) {
			die($e->getMessage());
		}
	}
}
class Store {
	public $pdo;
	public function __construct($pdo) {
		$this->pdo = $pdo;
	}
	public function comment($post) {
		$author = $post['author'];
		$body = htmlentities($post['body'],ENT_QUOTES);
		$id = $post['id'];
		$time = time();
		$ip = $_SERVER['REMOTE_ADDR'];
		try {
			$sql = $this->pdo->query("INSERT INTO `comments` (author,body,pictureId,timestamp,ip) VALUES ('$author','$body','$id','$time','$ip')");
			echo "success";
		} catch(PDOException $e) {
			die($e->getMessage());
		}
	}
}
class Action {
	public $pdo,$root;
	public function __construct($pdo) {
		$this->root = getenv('OPENSHIFT_DATA_DIR')."data/";
		$this->pdo = $pdo;
	}
	public function delete($post) {
		$source = explode("data/",$post["source"]);
		$thumb = explode("data/",$post["thumb"]);
		$path = "data/".$source[1];
		$id = $post["id"];
		$query = $this->pdo->query("SELECT id FROM `all` WHERE src = '$path'");
		if($query->rowCount() > 1) {
			try {
				$this->pdo->query("DELETE FROM `all` WHERE id = '$id'");
				echo "success";
			} catch(PDOException $e) {
				die($e->getMessage());
			}
		} else {
			if(unlink($this->root.$source[1])) {
				if(unlink($this->root.$thumb[1])) {
					try {
						$this->pdo->query("DELETE FROM `all` WHERE id = '$id'");
						try {
							$this->pdo->query("DELETE FROM `comments` WHERE pictureId = '$id'");
							echo "success";
						} catch(PDOException $e) {
							die("Error removing comment records");
						}
					} catch(PDOException $e) {
						die("Error removing database records");
					}
				} else {
					die("Error deleting thumbnail");
				}
			} else {
				die("Error deleting file.");
			}
		}
	}
	public function togglePrivacy($post) {
		$album = $post["album"];
		$lock = "0";
		if($post["command"] == "lock") $lock = "1";
		$query = $this->pdo->query("SELECT id FROM `albums` WHERE name = '$album'");
		if($query->rowCount() > 0) {
			try{
				$this->pdo->query("UPDATE `albums` SET kind = '$lock' WHERE name = '$album'");
				echo "success";
			} catch(PDOException $e) {
				die($e->getMessage());
			}
		} else {
			$time = time();
			try {
				$this->pdo->query("INSERT INTO `albums` (name,kind) VALUES ('$album','$lock')");
				echo "success";
			} catch(PDOException $e) {
				die($e->getMessage());
			}
		}
		
	}
}
$dsn = 'mysql:dbname=static;host='.HOST.';port='.PORT;
$pdo = new PDO($dsn,'adminHhI41YY','i4JF6GlABkqW');
if(isset($_FILES) && count($_FILES) > 0) {
	$up = array();
	$n = count($_FILES);
	for($i=0;$i<$n;$i++) {
		$up[$i] = new Upload($pdo);
		$up[$i]->id = $i;
		$up[$i]->load($_FILES[$i],$_POST["exif".$i],$_POST["album".$i]);
	}
	$album = $_POST["board"];
	$time = time();
	$query = $pdo->query("SELECT id FROM `albums` WHERE name = '$album'");
	if($query->rowCount() > 0) {
		try {
			$query = $pdo->query("UPDATE `albums` SET timestamp = '$time' WHERE name = '$album'");
			$q = $query->rowCount();
		} catch(PDOException $e) {
			$q = false;
		}
	} else {
		try {
			$q = $pdo->query("INSERT INTO `albums` (name,timestamp) VALUES ('$album','$time')");
		} catch(PDOException $e) {
			$q = false;
		}
	}
	if($q) {
		echo "success";
	} else {
		die("There was an error processing your request.");
	}
} elseif(isset($_POST)) {
	if($_POST["type"] == "store_comment") {
		$store = new Store($pdo);
		$store->comment($_POST);
	} elseif($_POST["type"] == "get_recent_boards") {
		$get = new Get($pdo);
		$get->boards($_POST);
	} elseif($_POST["type"] == "command") {
		$do = new Action($pdo);
		$do->delete($_POST);
	} elseif($_POST["type"] == "toggle_privacy") {
		$do = new Action($pdo);
		$do->togglePrivacy($_POST);
	} elseif($_POST["type"] == "get_data") {
		$get = new Get($pdo);
		$get->data($_POST);
	} else {
		if(isset($_GET['n']) && $_GET['n'] == '--static') {
			echo "URL -> ".getenv('OPENSHIFT_MYSQL_DB_URL')."\n";
			echo "username -> ".getenv('OPENSHIFT_MYSQL_DB_PORT')."\n";
			echo "port -> ".getenv('OPENSHIFT_MYSQL_DB_PORT')."\n";
			die("host -> ".getenv('OPENSHIFT_MYSQL_DB_HOST'));
		} else die("NO_DATA");
	}
} else {
	die("NO_DATA_SENT");
}
?>