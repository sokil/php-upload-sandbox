<?php

// static file handling
$info = parse_url($_SERVER['REQUEST_URI']);
$path = __DIR__ . $info['path'];
if (file_exists($path) && is_file($path)) {
    return false;
}

// composer
require_once __DIR__ . '/../vendor/autoload.php';

// create app
$app = new \Silex\Application([
    'debug' => true,
]);

$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__ . '/../views',
));

$app->get('/', function() use($app) {
    return $app['twig']->render('index.twig');
});

$app->post('upload', function() use($app) {
    $uploader = new \Sokil\Upload\Handler();

    try {
        $uploader->moveLocal(__DIR__ . '/uploads/');
    } catch (\Exception $e) {
        return $app->json([
            'server' => $_SERVER,
            'message' => $e->getMessage(),
        ], 500);
    }

    return $app->json([
        'transport' => $uploader->getTransportName(),
        'server'    => $_SERVER,
        'get'       => $_GET,
        'post'      => $_POST,
        'files'     => $_FILES,
    ]);
});

$app->run();
